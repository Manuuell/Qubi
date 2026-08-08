import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, assertUploadAllowed } from "./storage";

function makeFile(name: string, type: string, size: number) {
  return new File([new Uint8Array(Math.max(0, size))], name, { type });
}

describe("assertUploadAllowed", () => {
  it("acepta un archivo normal dentro del tope", () => {
    const file = makeFile("foto.png", "image/png", 1024);
    expect(() => assertUploadAllowed(file)).not.toThrow();
  });

  it("rechaza un archivo que supera el tope por defecto", () => {
    const file = makeFile("grande.png", "image/png", MAX_UPLOAD_BYTES + 1);
    expect(() => assertUploadAllowed(file)).toThrow(/supera/);
  });

  it("respeta un tope más estricto pasado por el llamador", () => {
    const file = makeFile("avatar.png", "image/png", 6 * 1024 * 1024);
    expect(() => assertUploadAllowed(file, 5 * 1024 * 1024)).toThrow(/supera/);
  });

  it("rechaza extensiones ejecutables sin importar el Content-Type", () => {
    const file = makeFile("instalador.exe", "image/png", 1024);
    expect(() => assertUploadAllowed(file)).toThrow(/no está permitido/);
  });

  it("rechaza HTML/SVG por extensión (ejecutable en el navegador si se abre desde el bucket)", () => {
    for (const name of ["pagina.html", "vector.svg", "script.js"]) {
      const file = makeFile(name, "", 1024);
      expect(() => assertUploadAllowed(file)).toThrow(/no está permitido/);
    }
  });

  it("rechaza un Content-Type de HTML/SVG aunque el nombre parezca inocuo", () => {
    const file = makeFile("foto.png", "text/html", 1024);
    expect(() => assertUploadAllowed(file)).toThrow(/no está permitido/);
  });

  it("acepta un PDF o un zip normales", () => {
    expect(() =>
      assertUploadAllowed(makeFile("informe.pdf", "application/pdf", 1024)),
    ).not.toThrow();
    expect(() =>
      assertUploadAllowed(makeFile("datos.zip", "application/zip", 1024)),
    ).not.toThrow();
  });
});
