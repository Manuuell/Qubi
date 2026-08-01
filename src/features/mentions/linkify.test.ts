import { describe, expect, it } from "vitest";
import { hasLink, linkifyChunks } from "./linkify";

describe("linkifyChunks", () => {
  it("deja el texto sin enlaces en un solo trozo", () => {
    expect(linkifyChunks("avancé con el formulario")).toEqual([
      { type: "text", value: "avancé con el formulario" },
    ]);
  });

  it("detecta una URL completa", () => {
    expect(linkifyChunks("mira https://qubi.app/tareas/3 ya")).toEqual([
      { type: "text", value: "mira " },
      {
        type: "link",
        value: "https://qubi.app/tareas/3",
        href: "https://qubi.app/tareas/3",
      },
      { type: "text", value: " ya" },
    ]);
  });

  it("completa el esquema en dominios escritos con www", () => {
    const [chunk] = linkifyChunks("www.figma.com/file/abc");
    expect(chunk).toEqual({
      type: "link",
      value: "www.figma.com/file/abc",
      href: "https://www.figma.com/file/abc",
    });
  });

  it("no se traga el punto final de la frase", () => {
    expect(linkifyChunks("está en https://qubi.app.")).toEqual([
      { type: "text", value: "está en " },
      { type: "link", value: "https://qubi.app", href: "https://qubi.app" },
      { type: "text", value: "." },
    ]);
  });

  it("encuentra varios enlaces", () => {
    const links = linkifyChunks(
      "diseño https://figma.com/a y specs www.notion.so/b",
    ).filter((c) => c.type === "link");
    expect(links).toHaveLength(2);
  });

  it("hasLink responde si hay algo clicable", () => {
    expect(hasLink("sin enlaces aquí")).toBe(false);
    expect(hasLink("con https://qubi.app")).toBe(true);
  });
});
