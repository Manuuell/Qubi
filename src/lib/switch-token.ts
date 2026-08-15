import { createHmac, timingSafeEqual } from "node:crypto";

// Token firmado que prueba que una cuenta ya se autenticó en este navegador.
// Permite cambiar de cuenta sin volver a escribir la contraseña. Se firma con
// AUTH_SECRET (HMAC-SHA256) y caduca a los 30 días.

const TTL_SECONDS = 60 * 60 * 24 * 30;

// El secreto se lee en cada llamada y no al importar el módulo: así siempre
// gana el valor real del entorno (el import puede ocurrir antes de que esté
// poblado) y los tests pueden cambiarlo.
//
// Sin secreto el HMAC se firmaría con clave vacía, y entonces cualquiera que
// conozca este formato puede fabricarse un token para entrar como cualquier
// usuario. Es el punto más sensible del sistema, así que se corta en seco.
function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Falta AUTH_SECRET: sin él los tokens de cambio de cuenta serían falsificables.",
    );
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", requireSecret()).update(body).digest("base64url");
}

export type SwitchPayload = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  exp: number; // epoch en segundos
};

type SwitchUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export function createSwitchToken(user: SwitchUser): string {
  const payload: SwitchPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySwitchToken(token: string): SwitchPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    // Sin secreto no hay nada que validar: se deniega el cambio de cuenta en
    // vez de reventar la petición (quien crea tokens sí avisa a gritos).
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString(),
    ) as SwitchPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
