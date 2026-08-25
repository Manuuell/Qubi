import { prisma } from "@/lib/db";
import { seal, unseal } from "@/lib/secret-box";

// Conexión con Google Calendar para escribir las tareas en el calendario
// PERSONAL de cada quien (a diferencia del feed ICS, que Google monta como un
// calendario aparte de solo lectura).
//
// Reutiliza el mismo cliente OAuth del login (AUTH_GOOGLE_ID/SECRET), pero el
// permiso es otro: entrar solo pide identidad y esto pide el calendario, así
// que cada persona tiene que autorizarlo una vez, aunque ya entre con Google.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
export const EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

// calendar.events permite crear/editar/borrar eventos, pero no leer ni tocar
// la configuración del calendario: es el permiso más pequeño que sirve.
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export const CALLBACK_PATH = "/api/google-calendar/callback";

// Cookie de un solo uso que ata la vuelta desde Google a quien inició el flujo.
export const STATE_COOKIE = "qubi.gcal_state";

export function googleCalendarConfigured(): boolean {
  return !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

function credentials() {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Falta AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET: Google Calendar no está configurado.",
    );
  }
  return { clientId, clientSecret };
}

// URL a la que se manda a la persona para que autorice.
export function buildConnectUrl(baseUrl: string, state: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}${CALLBACK_PATH}`,
    response_type: "code",
    scope: SCOPES,
    // Sin offline no llega refresh token y el acceso moriría en una hora;
    // sin consent Google lo omite si ya autorizó antes.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

// El id_token viene firmado por Google y directo de su endpoint por TLS, así
// que aquí solo hace falta leer el email, no volver a validarlo.
function emailFromIdToken(idToken: string | undefined): string {
  if (!idToken) return "";
  const payload = idToken.split(".")[1];
  if (!payload) return "";
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof claims.email === "string" ? claims.email : "";
  } catch {
    return "";
  }
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  return (await response.json()) as TokenResponse;
}

// Cierra el flujo: canjea el código por tokens y guarda la conexión.
export async function completeConnection(
  userId: string,
  code: string,
  baseUrl: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { clientId, clientSecret } = credentials();

  const tokens = await postToken({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: `${baseUrl}${CALLBACK_PATH}`,
    grant_type: "authorization_code",
  });

  if (tokens.error || !tokens.refresh_token) {
    // Sin refresh token no se puede sincronizar en segundo plano: mejor no
    // guardar una conexión que morirá en una hora.
    return {
      ok: false,
      reason: tokens.error_description ?? tokens.error ?? "sin_refresh_token",
    };
  }

  const encryptedRefreshToken = seal(tokens.refresh_token);
  const googleEmail = emailFromIdToken(tokens.id_token);

  await prisma.googleCalendarLink.upsert({
    where: { userId },
    create: { userId, encryptedRefreshToken, googleEmail },
    update: { encryptedRefreshToken, googleEmail },
  });

  return { ok: true };
}

export type CalendarConnection = { googleEmail: string; connectedAt: Date };

export async function getConnection(
  userId: string,
): Promise<CalendarConnection | null> {
  const link = await prisma.googleCalendarLink.findUnique({
    where: { userId },
    select: { googleEmail: true, createdAt: true },
  });
  return link
    ? { googleEmail: link.googleEmail, connectedAt: link.createdAt }
    : null;
}

// Igual que getConnection pero para varias personas a la vez (p. ej. el
// selector de invitados de una reunión, para marcar quién ya conectó su
// calendario sin hacer una consulta por persona).
export async function getConnections(
  userIds: string[],
): Promise<Map<string, CalendarConnection>> {
  if (userIds.length === 0) return new Map();
  const links = await prisma.googleCalendarLink.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, googleEmail: true, createdAt: true },
  });
  return new Map(
    links.map((l) => [
      l.userId,
      { googleEmail: l.googleEmail, connectedAt: l.createdAt },
    ]),
  );
}

// Access token fresco a partir del refresh guardado. null = hay que volver a
// conectar (la persona revocó el permiso, o el dato ya no se puede descifrar).
export async function getAccessToken(userId: string): Promise<string | null> {
  const link = await prisma.googleCalendarLink.findUnique({
    where: { userId },
    select: { encryptedRefreshToken: true },
  });
  if (!link) return null;

  const refreshToken = unseal(link.encryptedRefreshToken);
  if (!refreshToken) return null;

  const { clientId, clientSecret } = credentials();
  const tokens = await postToken({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  if (tokens.error || !tokens.access_token) {
    // Google responde invalid_grant cuando revocan el acceso desde su cuenta:
    // la conexión ya no sirve para nada, se retira.
    if (tokens.error === "invalid_grant") await disconnect(userId);
    return null;
  }
  return tokens.access_token;
}

// Retira el permiso en Google y borra la conexión. Se intenta revocar primero
// para no dejar un token vivo colgando, pero si Google falla se borra igual.
export async function disconnect(userId: string): Promise<void> {
  const link = await prisma.googleCalendarLink.findUnique({
    where: { userId },
    select: { encryptedRefreshToken: true },
  });

  if (link) {
    const refreshToken = unseal(link.encryptedRefreshToken);
    if (refreshToken) {
      try {
        await fetch(REVOKE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: refreshToken }),
        });
      } catch {
        // Da igual: lo que importa es que Qubi deje de tener la credencial.
      }
    }
  }

  await prisma.googleCalendarLink.deleteMany({ where: { userId } });
}

// Wrapper delgado sobre fetch para hablar con la API de eventos de Google
// Calendar. Lo comparten la sincronización de tareas y la de reuniones.
export async function callGoogle(
  accessToken: string,
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<{ ok: boolean; status: number; id?: string }> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (method === "DELETE") {
    // 410 = ya estaba borrado en Google; para nosotros es el mismo final.
    return {
      ok: response.ok || response.status === 410,
      status: response.status,
    };
  }
  if (!response.ok) return { ok: false, status: response.status };

  const json = (await response.json()) as { id?: string };
  return { ok: true, status: response.status, id: json.id };
}
