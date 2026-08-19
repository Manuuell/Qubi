import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { seal, unseal } from "./secret-box";

describe("secret-box", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "secreto-de-prueba";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("recupera en claro lo que cifró", () => {
    expect(unseal(seal("1//refresh-token-de-google"))).toBe(
      "1//refresh-token-de-google",
    );
  });

  it("no deja el texto original a la vista", () => {
    expect(seal("token-secreto")).not.toContain("token-secreto");
  });

  it("cifra distinto cada vez, aunque el texto sea el mismo", () => {
    // Si el IV se repitiera, dos tokens iguales darían el mismo cifrado y se
    // podría deducir quién comparte credencial.
    expect(seal("mismo")).not.toBe(seal("mismo"));
  });

  it("aguanta acentos y emoji", () => {
    expect(unseal(seal("configuración 🚀 ñ"))).toBe("configuración 🚀 ñ");
  });

  it("rechaza un dato manipulado en vez de devolver basura", () => {
    const [iv, tag] = seal("token").split(".");
    const alterado = `${iv}.${tag}.${Buffer.from("otra cosa").toString("base64url")}`;

    expect(unseal(alterado)).toBeNull();
  });

  it("rechaza lo cifrado con otro secreto", () => {
    const ajeno = seal("token");
    process.env.AUTH_SECRET = "otro-secreto-distinto";

    expect(unseal(ajeno)).toBeNull();
  });

  it("rechaza formatos inválidos", () => {
    expect(unseal("")).toBeNull();
    expect(unseal("sin-puntos")).toBeNull();
    expect(unseal("solo.dos")).toBeNull();
  });

  it("sin AUTH_SECRET no cifra ni descifra", () => {
    const valido = seal("token");
    delete process.env.AUTH_SECRET;

    expect(() => seal("token")).toThrow(/AUTH_SECRET/);
    expect(() => unseal(valido)).toThrow(/AUTH_SECRET/);
  });
});
