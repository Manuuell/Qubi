"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createIssueAction } from "@/server/actions/issue";

export function NewIssueForm({ workspaceId }: { workspaceId: string }) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(() => createIssueAction({ workspaceId, title }));
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del nuevo issue…"
      />
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" />
        Nuevo issue
      </Button>
    </form>
  );
}
