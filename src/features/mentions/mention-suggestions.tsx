import { initials } from "@/features/task/labels";
import type { MentionMember } from "@/features/mentions/mentions";

export function MentionSuggestions({
  candidates,
  onSelect,
}: {
  candidates: MentionMember[];
  onSelect: (member: MentionMember) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute bottom-full left-0 z-30 mb-1 w-56 overflow-hidden rounded-2xl p-1 duration-100">
      {candidates.map((m) => (
        <button
          key={m.id}
          type="button"
          // onMouseDown (no click): evita que el blur del textarea cierre el
          // menú antes de que el clic llegue a registrarse.
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(m);
          }}
          className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm"
        >
          <span className="bg-primary/10 text-primary grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-medium">
            {initials(m.name, m.email)}
          </span>
          <span className="truncate">{m.name?.trim() || m.email}</span>
        </button>
      ))}
    </div>
  );
}
