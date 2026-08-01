import { parseMentions } from "@/features/mentions/mentions";
import { linkifyChunks } from "@/features/mentions/linkify";

// Pinta el texto de un comentario o mensaje resaltando las menciones
// @[Nombre](id) como una píldora, sin exponer el formato interno, y dejando
// clicables los enlaces escritos dentro (avances con referencias, specs…).
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
          <Linkified key={i} value={s.value} />
        ),
      )}
    </>
  );
}

function Linkified({ value }: { value: string }) {
  return (
    <>
      {linkifyChunks(value).map((chunk, i) =>
        chunk.type === "link" ? (
          <a
            key={i}
            href={chunk.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {chunk.value}
          </a>
        ) : (
          <span key={i}>{chunk.value}</span>
        ),
      )}
    </>
  );
}
