import { createHmac, timingSafeEqual } from "node:crypto";

// Token firmado que prueba que una cuenta ya se autenticó en este navegador.
// Permite cambiar de cuenta sin volver a escribir la contraseña. Se firma con
// AUTH_SECRET (HMAC-SHA256) y caduca a los 30 días.

const SECRET = process.env.AUTH_SECRET ?? "";
const TTL_SECONDS = 60 * 60 * 24 * 30;

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
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySwitchToken(token: string): SwitchPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expected = createHmac("sha256", SECRET)
    .update(body)
    .digest("base64url");
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
