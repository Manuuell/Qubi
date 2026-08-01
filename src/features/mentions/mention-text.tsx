import { parseMentions } from "@/features/mentions/mentions";

// Pinta el texto de un comentario o mensaje resaltando las menciones
// @[Nombre](id) como una píldora, sin exponer el formato interno.
export function MentionText({ body }: { body: string }) {
  const segments = parseMentions(body);
  return (
    <>
      {segments.map((s, i) =>
        s.type === "mention" ? (
          <span
            key={i}
            className="bg-primary/10 text-primary mx-0.5 rounded px-1 py-0.5 text-[0.95em] font-medium"
          >
            @{s.name}
          </span>
        ) : (
          <span key={i}>{s.value}</span>
        ),
      )}
    </>
  );
}
