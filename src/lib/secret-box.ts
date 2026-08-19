import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

// Cifrado simétrico para credenciales que hay que poder recuperar en claro,
// a diferencia de las contraseñas (que se hashean y no se descifran nunca).
// Lo usa el refresh token de Google Calendar: es una llave de larga vida al
// calendario de una persona, así que en la base de datos no va en claro.
//
// AES-256-GCM: además de cifrar, detecta si el dato fue manipulado. La clave
// se deriva de AUTH_SECRET; sin secreto se corta en seco, por lo mismo que en
// switch-token.ts — cifrar con clave vacía no es cifrar.

const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits, lo recomendado para GCM
const SALT = "qubi.secret-box.v1";

// Derivar la clave cuesta ~100 ms, demasiado para hacerlo en cada petición.
// Se memoriza junto al secreto que la produjo, para que un cambio de
// AUTH_SECRET (o los tests) la regeneren en vez de servir una obsoleta.
let cached: { secret: string; key: Buffer } | null = null;

function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Falta AUTH_SECRET: no se pueden cifrar ni descifrar credenciales.",
    );
  }
  if (cached?.secret !== secret) {
    cached = { secret, key: scryptSync(secret, SALT, KEY_BYTES) };
  }
  return cached.key;
}

// Devuelve "iv.tag.cifrado", los tres en base64url.
export function seal(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), body]
    .map((b) => b.toString("base64url"))
    .join(".");
}

// null si el formato no cuadra, el dato fue manipulado o la clave es otra:
// quien llame decide qué hacer (normalmente, pedir reconectar la cuenta).
export function unseal(sealed: string): string | null {
  // Fuera del try a propósito: que falte el secreto es un fallo de
  // configuración del servidor y tiene que verse, no disfrazarse de dato malo.
  const k = key();

  const parts = sealed.split(".");
  if (parts.length !== 3) return null;

  try {
    const [iv, tag, body] = parts.map((p) => Buffer.from(p, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", k, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}
