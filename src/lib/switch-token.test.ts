import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createSwitchToken, verifySwitchToken } from "./switch-token";

// Este token deja entrar a una cuenta SIN contraseña, así que lo que importa
// no es solo que el camino feliz funcione, sino que todo lo demás se deniegue.

const USER = {
  id: "user_123",
  email: "alguien@qubi.local",
  name: "Alguien",
  image: null,
};

describe("switch-token", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "secreto-de-prueba";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.AUTH_SECRET;
    } else {
      process.env.AUTH_SECRET = originalSecret;
    }
    vi.useRealTimers();
  });

  it("acepta un token recién creado y devuelve sus datos", () => {
    const payload = verifySwitchToken(createSwitchToken(USER));

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(USER.id);
    expect(payload?.email).toBe(USER.email);
    expect(payload?.name).toBe(USER.name);
  });

  it("rechaza un token con la firma manipulada", () => {
    const [body] = createSwitchToken(USER).split(".");

    expect(verifySwitchToken(`${body}.firmaInventada`)).toBeNull();
  });

  it("rechaza un payload alterado que conserva la firma original", () => {
    const [, sig] = createSwitchToken(USER).split(".");
    const suplantado = Buffer.from(
      JSON.stringify({
        userId: "user_admin",
        email: "admin@qubi.local",
        name: null,
        image: null,
        exp: Math.floor(Date.now() / 1000) + 60,
      }),
    ).toString("base64url");

    expect(verifySwitchToken(`${suplantado}.${sig}`)).toBeNull();
  });

  it("rechaza un token firmado con otro secreto", () => {
    process.env.AUTH_SECRET = "el-secreto-del-atacante";
    const ajeno = createSwitchToken(USER);

    process.env.AUTH_SECRET = "secreto-de-prueba";

    expect(verifySwitchToken(ajeno)).toBeNull();
  });

  it("rechaza un token caducado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSwitchToken(USER);

    // El TTL es de 30 días: un día más y ya no vale.
    vi.setSystemTime(new Date("2026-01-31T00:00:01Z"));

    expect(verifySwitchToken(token)).toBeNull();
  });

  it("rechaza tokens con formato inválido", () => {
    expect(verifySwitchToken("")).toBeNull();
    expect(verifySwitchToken("sin-punto")).toBeNull();
    expect(verifySwitchToken("tres.partes.aqui")).toBeNull();
  });

  it("sin AUTH_SECRET no se pueden crear tokens", () => {
    delete process.env.AUTH_SECRET;

    expect(() => createSwitchToken(USER)).toThrow(/AUTH_SECRET/);
  });

  it("sin AUTH_SECRET se deniega cualquier token en vez de validarlo", () => {
    const token = createSwitchToken(USER);
    delete process.env.AUTH_SECRET;

    expect(verifySwitchToken(token)).toBeNull();
  });
});
