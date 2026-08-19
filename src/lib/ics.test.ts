import { describe, it, expect } from "vitest";
import {
  escapeText,
  foldLine,
  keyToIcsDate,
  dateToIcsUtc,
  buildIcsFeed,
} from "@/lib/ics";

describe("escapeText", () => {
  it("escapa backslashes, comas y punto y coma", () => {
    expect(escapeText("a\\b,c;d")).toBe("a\\\\b\\,c\\;d");
  });

  it("convierte saltos de línea en \\n", () => {
    expect(escapeText("línea 1\nlínea 2")).toBe("línea 1\\nlínea 2");
  });
});

// Toda línea física de un feed (contando el espacio inicial de las
// continuaciones) debe caber en 75 octetos. Se comprueba sobre las líneas
// reales, no sobre los trozos sin el espacio: es lo que lee el parser.
function physicalLines(folded: string): string[] {
  return folded.split("\r\n");
}

function maxOctets(folded: string): number {
  return Math.max(
    ...physicalLines(folded).map((l) => Buffer.byteLength(l, "utf8")),
  );
}

describe("foldLine", () => {
  it("no toca líneas cortas", () => {
    expect(foldLine("SUMMARY:Hola")).toBe("SUMMARY:Hola");
  });

  it("dobla a 75 octetos con CRLF + espacio", () => {
    const long = "X:" + "a".repeat(200);
    const folded = foldLine(long);
    expect(folded).toContain("\r\n ");
    expect(maxOctets(folded)).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe(long);
  });

  it("respeta el límite tambien con acentos", () => {
    // El corte se mide en octetos pero la cadena se recorre por caracteres:
    // con multibyte, contar unos por otros se pasaba del limite.
    const long = "SUMMARY:" + "ñ".repeat(120);
    const folded = foldLine(long);
    expect(maxOctets(folded)).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe(long);
  });

  it("respeta el límite con emoji (pares surrogados)", () => {
    const long = "SUMMARY:" + "🚀".repeat(60);
    const folded = foldLine(long);
    expect(maxOctets(folded)).toBeLessThanOrEqual(75);
    expect(folded.replaceAll("\r\n ", "")).toBe(long);
    // Si se partiera un par surrogado, al codificar saldria U+FFFD.
    expect(Buffer.from(folded, "utf8").toString("utf8")).not.toContain(
      "\uFFFD",
    );
  });

  it("no emite lineas de continuacion vacias", () => {
    for (const long of [
      "SUMMARY:" + "a".repeat(142),
      "SUMMARY:" + "ñ".repeat(120),
      "SUMMARY:" + "🚀".repeat(60),
    ]) {
      expect(physicalLines(foldLine(long))).not.toContain(" ");
    }
  });
});

describe("fechas", () => {
  it("convierte clave de día a fecha iCalendar", () => {
    expect(keyToIcsDate("2026-08-17")).toBe("20260817");
  });

  it("formatea timestamps UTC", () => {
    expect(dateToIcsUtc(new Date("2026-08-17T09:30:05Z"))).toBe(
      "20260817T093005Z",
    );
  });
});

describe("buildIcsFeed", () => {
  const event = {
    uid: "task-123@qubi",
    summary: "Publicar la landing, versión 2",
    description: "Proyecto: Web · https://qubi.local/w/ws1/tasks/4",
    startKey: "2026-08-17",
    endKey: "2026-08-18",
    updatedAt: new Date("2026-08-16T10:00:00Z"),
  };

  it("genera un VCALENDAR válido con CRLF", () => {
    const feed = buildIcsFeed([event], "Agenda de Ana");
    expect(feed.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0")).toBe(true);
    expect(feed.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(feed).toContain("X-WR-CALNAME:Agenda de Ana");
  });

  it("incluye el evento todo el día con UID estable", () => {
    const feed = buildIcsFeed([event], "Agenda");
    expect(feed).toContain("UID:task-123@qubi");
    expect(feed).toContain("DTSTART;VALUE=DATE:20260817");
    expect(feed).toContain("DTEND;VALUE=DATE:20260818");
    expect(feed).toContain("DTSTAMP:20260816T100000Z");
    expect(feed).toContain(
      "DESCRIPTION:Proyecto: Web · https://qubi.local/w/ws1/tasks/4",
    );
  });

  it("escapa comas y saltos de línea en el resumen", () => {
    const feed = buildIcsFeed([{ ...event, summary: "A, B\nC" }], "Agenda");
    expect(feed).toContain("SUMMARY:A\\, B\\nC");
  });

  it("no incluye DESCRIPTION si no hay", () => {
    const feed = buildIcsFeed([{ ...event, description: undefined }], "Agenda");
    expect(feed).not.toContain("DESCRIPTION:");
  });
});
