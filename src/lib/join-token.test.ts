import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isValidJoinToken, joinPath, joinUrl } from "@/lib/join-token";

describe("isValidJoinToken", () => {
  it("acepta tokens reales de 32 bytes en base64url", () => {
    for (let index = 0; index < 50; index++) {
      expect(isValidJoinToken(randomBytes(32).toString("base64url"))).toBe(
        true,
      );
    }
  });

  it.each([
    "",
    undefined,
    42,
    "a".repeat(42),
    "a".repeat(44),
    `${"a".repeat(42)}/`,
    `${"a".repeat(42)}.`,
    `${"a".repeat(42)}+`,
    `${"a".repeat(42)}=`,
    `${"a".repeat(40)}%2F`,
    `${"a".repeat(42)} `,
    "../x",
    "//evil.com",
  ])("rechaza %j", (value) => {
    expect(isValidJoinToken(value)).toBe(false);
  });
});

describe("rutas de unión", () => {
  it("construye la ruta relativa", () => {
    const token = "a".repeat(43);
    expect(joinPath(token)).toBe(`/join/${token}`);
  });

  it("construye la URL absoluta", () => {
    const token = "b".repeat(43);
    expect(joinUrl("https://qubi.example", token)).toBe(
      `https://qubi.example/join/${token}`,
    );
  });
});
