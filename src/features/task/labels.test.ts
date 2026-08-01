import { describe, expect, it } from "vitest";
import { initials, toDateInputValue } from "./labels";

describe("initials", () => {
  it("usa las primeras 2 letras del nombre si existe", () => {
    expect(initials("Ana Pérez", "a@x.com")).toBe("AN");
  });

  it("cae al email si no hay nombre", () => {
    expect(initials(null, "beto@x.com")).toBe("BE");
  });

  it("cae al email si el nombre es solo espacios", () => {
    expect(initials("   ", "carla@x.com")).toBe("CA");
  });

  it("siempre en mayúsculas", () => {
    expect(initials("ana", "a@x.com")).toBe("AN");
  });
});

describe("toDateInputValue", () => {
  it("null da string vacío", () => {
    expect(toDateInputValue(null)).toBe("");
  });

  it("formatea a YYYY-MM-DD", () => {
    const d = new Date(2026, 0, 5); // 5 de enero de 2026, hora local
    expect(toDateInputValue(d)).toBe("2026-01-05");
  });

  it("rellena con ceros mes y día de un dígito", () => {
    const d = new Date(2026, 2, 3); // 3 de marzo
    expect(toDateInputValue(d)).toBe("2026-03-03");
  });
});
