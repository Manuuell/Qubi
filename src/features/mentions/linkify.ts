// Parte un texto en trozos normales y enlaces, para poder pintar los enlaces
// que la gente escribe en avances, comentarios y mensajes como algo clicable.
// Se aceptan http(s):// y también dominios escritos "a secas" (www.algo.com).

export type TextChunk =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_RE = /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+)/gi;

// Los signos de puntuación finales no forman parte del enlace: "mira example.com."
const TRAILING = /[.,;:!?)\]}'"]+$/;

export function linkifyChunks(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let last = 0;

  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    let value = match[0];
    const trimmed = value.replace(TRAILING, "");
    const trailing = value.slice(trimmed.length);
    value = trimmed;
    if (!value) continue;

    if (start > last) {
      chunks.push({ type: "text", value: text.slice(last, start) });
    }
    chunks.push({
      type: "link",
      value,
      href: value.startsWith("www.") ? `https://${value}` : value,
    });
    if (trailing) chunks.push({ type: "text", value: trailing });
    last = start + match[0].length;
  }

  if (last < text.length) {
    chunks.push({ type: "text", value: text.slice(last) });
  }
  return chunks;
}

export function hasLink(text: string) {
  return linkifyChunks(text).some((c) => c.type === "link");
}
