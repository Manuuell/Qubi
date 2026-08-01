// Una mención se guarda en el texto como @[Nombre](userId) — el usuario
// nunca ve ese formato: el autocompletado lo inserta al elegir a alguien, y
// MentionText lo vuelve a convertir en "@Nombre" resaltado al mostrarlo.
const MENTION_RE = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;

export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) ids.add(m[2]);
  return [...ids];
}

export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; userId: string };

export function parseMentions(body: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;
  for (const m of body.matchAll(MENTION_RE)) {
    const index = m.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: body.slice(lastIndex, index) });
    }
    segments.push({ type: "mention", name: m[1], userId: m[2] });
    lastIndex = index + m[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: "text", value: body.slice(lastIndex) });
  }
  return segments;
}

export type MentionMember = {
  id: string;
  name: string | null;
  email: string;
};

export function filterMentionCandidates(
  members: MentionMember[],
  query: string,
) {
  const q = query.trim().toLowerCase();
  const matches = members.filter((m) => {
    const label = (m.name?.trim() || m.email).toLowerCase();
    return q === "" || label.includes(q);
  });
  return matches.slice(0, 6);
}

export function mentionMarkup(member: MentionMember) {
  const name = member.name?.trim() || member.email;
  return `@[${name}](${member.id})`;
}

// Para vistas previas de una sola línea (lista de conversaciones) donde no
// vale la pena renderizar JSX: deja "@Nombre" en texto plano.
export function stripMentionMarkup(body: string) {
  return body.replace(MENTION_RE, "@$1");
}
