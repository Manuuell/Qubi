// Generador de feeds iCalendar (RFC 5545) para sincronizar la agenda con
// Google Calendar, Apple Calendar, Outlook… mediante URL de suscripción.
// Módulo puro (sin Prisma ni Next) para poder probarlo en aislamiento.

// Escapa un texto según iCalendar: backslash, punto y coma, coma y saltos
// de línea. https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.11
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Dobla las líneas largas como exige el RFC: ninguna línea física puede pasar
// de 75 octetos y cada continuación empieza por un espacio, que también cuenta.
// Por eso al primer trozo le caben 75 octetos y a los siguientes solo 74.
//
// Se recorre por puntos de código (no por unidades UTF-16) y se mide en
// octetos UTF-8: son magnitudes distintas, y confundirlas hacía que cualquier
// título con acentos —o sea, casi todos— acabara pasándose del límite.
export function foldLine(line: string): string {
  if (Buffer.byteLength(line, "utf8") <= 75) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  let budget = 75;

  for (const ch of line) {
    const size = Buffer.byteLength(ch, "utf8");
    if (currentBytes + size > budget) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
      budget = 74; // los trozos siguientes cargan con el espacio inicial
    }
    current += ch;
    currentBytes += size;
  }
  if (current) chunks.push(current);

  return chunks.join("\r\n ");
}

// Clave "YYYY-MM-DD" -> fecha iCalendar "YYYYMMDD" (todo el día, sin zona).
export function keyToIcsDate(key: string): string {
  return key.replaceAll("-", "");
}

// Timestamp -> "YYYYMMDDTHHMMSSZ" (UTC, obligatorio para DTSTAMP).
export function dateToIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(d.getUTCDate()).padStart(2, "0")}T` +
    `${String(d.getUTCHours()).padStart(2, "0")}` +
    `${String(d.getUTCMinutes()).padStart(2, "0")}` +
    `${String(d.getUTCSeconds()).padStart(2, "0")}Z`
  );
}

// Un evento "todo el día": [startKey, endKey) en días locales.
// UID estable por tarea para que Google actualice el evento en vez de
// duplicarlo cuando cambian los datos.
export type IcsEventInput = {
  uid: string;
  summary: string;
  description?: string;
  startKey: string; // "YYYY-MM-DD" inclusive
  endKey: string; // "YYYY-MM-DD" exclusivo
  updatedAt: Date;
};

function eventLines(e: IcsEventInput): string[] {
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${dateToIcsUtc(e.updatedAt)}`,
    `DTSTART;VALUE=DATE:${keyToIcsDate(e.startKey)}`,
    `DTEND;VALUE=DATE:${keyToIcsDate(e.endKey)}`,
    `SUMMARY:${escapeText(e.summary)}`,
  ];
  if (e.description) {
    lines.push(`DESCRIPTION:${escapeText(e.description)}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsFeed(events: IcsEventInput[], calName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qubi//Agenda de equipo//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
    ...events.flatMap(eventLines),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
