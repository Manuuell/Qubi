"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  filterMentionCandidates,
  mentionMarkup,
  type MentionMember,
} from "@/features/mentions/mentions";
import { MentionSuggestions } from "@/features/mentions/mention-suggestions";

// Detecta "@algo" justo antes del cursor (sin espacio de por medio) para
// decidir si hay que mostrar el desplegable y con qué texto filtrar.
function activeMentionQuery(text: string, cursor: number) {
  const before = text.slice(0, cursor);
  const match = before.match(/(?:^|\s)@([^\s@]*)$/);
  return match ? match[1] : null;
}

export const MentionTextarea = forwardRef<
  HTMLTextAreaElement,
  {
    members: MentionMember[];
    rows?: number;
    placeholder?: string;
    className?: string;
    defaultValue?: string;
  }
>(function MentionTextarea(
  { members, rows = 3, placeholder, className, defaultValue },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current!, []);
  const [query, setQuery] = useState<string | null>(null);

  function handleInput() {
    const el = innerRef.current;
    if (!el) return;
    setQuery(activeMentionQuery(el.value, el.selectionStart ?? 0));
  }

  function select(member: MentionMember) {
    const el = innerRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, cursor);
    const after = el.value.slice(cursor);
    const withoutQuery = before.replace(/(?:^|\s)@([^\s@]*)$/, (m) =>
      m.startsWith(" ") ? " " : "",
    );
    const insertion = `${mentionMarkup(member)} `;
    const next = withoutQuery + insertion + after;
    el.value = next;
    const newCursor = withoutQuery.length + insertion.length;
    el.focus();
    el.setSelectionRange(newCursor, newCursor);
    setQuery(null);
  }

  const candidates =
    query !== null ? filterMentionCandidates(members, query) : [];

  return (
    <div className="relative">
      <textarea
        ref={innerRef}
        rows={rows}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onInput={handleInput}
        onBlur={() => setQuery(null)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setQuery(null);
        }}
        className={className}
      />
      {query !== null && (
        <MentionSuggestions candidates={candidates} onSelect={select} />
      )}
    </div>
  );
});
