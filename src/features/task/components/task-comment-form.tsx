"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addTaskCommentAction } from "@/server/actions/task";

export function TaskCommentForm({
  taskId,
  workspaceId,
  projectId,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = textRef.current?.value ?? "";
    const file = fileRef.current?.files?.[0] ?? null;
    if (!body.trim() && !file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("workspaceId", workspaceId);
      fd.set("projectId", projectId);
      fd.set("body", body);
      if (file) fd.set("file", file);
      await addTaskCommentAction(fd);
      if (textRef.current) textRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
      setFileName(null);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={textRef}
        rows={3}
        placeholder="Escribe un comentario…"
        className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border p-3 text-sm outline-none focus:ring-2"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="text-muted-foreground hover:text-foreground transition-ios flex cursor-pointer items-center gap-1.5 text-xs">
          <Paperclip className="size-3.5" />
          {fileName ?? "Adjuntar captura"}
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
            Comentar
          </Button>
        </div>
      </div>
    </form>
  );
}
