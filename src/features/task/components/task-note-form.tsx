"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentionTextarea } from "@/features/mentions/mention-textarea";
import type { MentionMember } from "@/features/mentions/mentions";

// Formulario genérico reutilizado para comentarios normales, avances (kind
// PROGRESS) y feedback del manager (kind REVIEW_FEEDBACK) — solo cambia la
// server action que recibe.
export function TaskNoteForm({
  taskId,
  workspaceId,
  projectId,
  action,
  placeholder,
  submitLabel,
  attachmentLabel = "Adjuntar captura",
  members,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  submitLabel: string;
  attachmentLabel?: string;
  members: MentionMember[];
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = textRef.current?.value ?? "";
    const file = fileRef.current?.files?.[0] ?? null;
    if (!body.trim() && !file) return;
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("taskId", taskId);
        fd.set("workspaceId", workspaceId);
        fd.set("projectId", projectId);
        fd.set("body", body);
        if (file) fd.set("file", file);
        await action(fd);
        if (textRef.current) textRef.current.value = "";
        if (fileRef.current) fileRef.current.value = "";
        setFileName(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <MentionTextarea
        ref={textRef}
        members={members}
        rows={3}
        placeholder={placeholder}
        className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border p-3 text-sm outline-none focus:ring-2"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="text-muted-foreground hover:text-foreground transition-ios flex cursor-pointer items-center gap-1.5 text-xs">
          <Paperclip className="size-3.5" />
          {fileName ?? attachmentLabel}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        <div className="flex items-center gap-2">
          {fileName && (
            <button
              type="button"
              onClick={() => {
                if (fileRef.current) fileRef.current.value = "";
                setFileName(null);
              }}
              aria-label="Quitar adjunto"
              className="text-muted-foreground hover:text-destructive transition-ios"
            >
              <X className="size-3.5" />
            </button>
          )}
          <Button type="submit" disabled={pending}>
            {submitLabel}
          </Button>
        </div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
}
