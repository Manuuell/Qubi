// 32 bytes aleatorios codificados con randomBytes(32).toString("base64url")
// siempre producen exactamente 43 caracteres de este alfabeto.
const JOIN_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function isValidJoinToken(value: unknown): value is string {
  return typeof value === "string" && JOIN_TOKEN_RE.test(value);
}

export function joinPath(token: string) {
  return `/join/${token}`;
}

export function joinUrl(baseUrl: string, token: string) {
  return `${baseUrl}${joinPath(token)}`;
}
