import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

// Tokens de un solo uso para verificación de email y restablecimiento de
// contraseña. Se reutiliza el modelo VerificationToken de Auth.js. En la base
// de datos solo se guarda el hash del token; el valor en claro viaja en el
// enlace del correo y nunca se persiste.

export type TokenPurpose = "verify" | "reset";

const TTL: Record<TokenPurpose, number> = {
  verify: 1000 * 60 * 60 * 24, // 24 h
  reset: 1000 * 60 * 60, // 1 h
};

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

// Crea un token nuevo (invalidando los anteriores del mismo propósito/email)
// y devuelve el valor en claro para incluirlo en el enlace.
export async function issueToken(
  purpose: TokenPurpose,
  email: string,
): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const identifier = `${purpose}:${email}`;

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(raw),
      expires: new Date(Date.now() + TTL[purpose]),
    },
  });

  return raw;
}

// Valida y consume (borra) un token. Devuelve el email si es válido y no ha
// caducado; null en cualquier otro caso.
export async function consumeToken(
  purpose: TokenPurpose,
  raw: string,
): Promise<string | null> {
  if (!raw) return null;

  const record = await prisma.verificationToken.findFirst({
    where: { token: hashToken(raw), identifier: { startsWith: `${purpose}:` } },
  });
  if (!record) return null;

  // Un solo uso: se borra siempre, válido o caducado.
  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: record.identifier,
        token: record.token,
      },
    },
  });

  if (record.expires < new Date()) return null;
  return record.identifier.slice(purpose.length + 1); // quita "purpose:"
}
