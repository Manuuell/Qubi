import { describe, expect, it } from "vitest";
import {
  extractMentionedUserIds,
  filterMentionCandidates,
  mentionMarkup,
  parseMentions,
  stripMentionMarkup,
} from "./mentions";

describe("mentionMarkup", () => {
  it("usa el nombre si existe", () => {
    expect(
      mentionMarkup({ id: "u1", name: "Ana Pérez", email: "a@x.com" }),
    ).toBe("@[Ana Pérez](u1)");
  });

  it("cae al email si no hay nombre", () => {
    expect(mentionMarkup({ id: "u1", name: null, email: "a@x.com" })).toBe(
      "@[a@x.com](u1)",
    );
  });
});

describe("extractMentionedUserIds", () => {
  it("extrae los ids de todas las menciones", () => {
    const body = "Hola @[Ana](u1) y @[Beto](u2), revisen esto @[Ana](u1)";
    expect(extractMentionedUserIds(body)).toEqual(["u1", "u2"]);
  });

  it("devuelve vacío si no hay menciones", () => {
    expect(extractMentionedUserIds("Sin menciones aquí")).toEqual([]);
  });
});

describe("parseMentions", () => {
  it("divide el texto en segmentos de texto y mención", () => {
    const segments = parseMentions("Hola @[Ana](u1), ¿cómo va?");
    expect(segments).toEqual([
      { type: "text", value: "Hola " },
      { type: "mention", name: "Ana", userId: "u1" },
      { type: "text", value: ", ¿cómo va?" },
    ]);
  });

  it("texto sin menciones es un único segmento", () => {
    expect(parseMentions("solo texto")).toEqual([
      { type: "text", value: "solo texto" },
    ]);
  });
});

describe("stripMentionMarkup", () => {
  it("deja @Nombre en texto plano para vistas previas", () => {
    expect(stripMentionMarkup("Oye @[Ana Pérez](u1) mira esto")).toBe(
      "Oye @Ana Pérez mira esto",
    );
  });
});

describe("filterMentionCandidates", () => {
  const members = [
    { id: "1", name: "Ana Pérez", email: "ana@x.com" },
    { id: "2", name: "Beto Gómez", email: "beto@x.com" },
    { id: "3", name: null, email: "carla@x.com" },
  ];

  it("sin query devuelve todos (hasta el límite)", () => {
    expect(filterMentionCandidates(members, "")).toHaveLength(3);
  });

  it("filtra por nombre, insensible a mayúsculas", () => {
    const result = filterMentionCandidates(members, "ana");
    expect(result).toEqual([members[0]]);
  });

  it("filtra por email cuando no hay nombre", () => {
    const result = filterMentionCandidates(members, "carla");
    expect(result).toEqual([members[2]]);
  });

  it("limita a 6 resultados", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `User ${i}`,
      email: `u${i}@x.com`,
    }));
    expect(filterMentionCandidates(many, "")).toHaveLength(6);
  });
});
