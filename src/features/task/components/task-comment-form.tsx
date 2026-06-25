"use client";

import { useRef, useTransition, type FormEvent } from "react";
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    const body = ref.current?.value ?? "";
    if (!body.trim()) return;
    startTransition(async () => {
      await addTaskCommentAction({ taskId, workspaceId, projectId, body });
      if (ref.current) ref.current.value = "";
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <textarea
        ref={ref}
        rows={3}
        placeholder="Escribe un comentario…"
        className="bg-background focus:ring-ring w-full rounded-md border p-2 text-sm outline-none focus:ring-1"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          Comentar
        </Button>
      </div>
    </form>
  );
}
