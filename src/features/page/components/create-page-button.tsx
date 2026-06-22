"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageAction } from "@/server/actions/page";

export function CreatePageButton({
  workspaceId,
  parentId = null,
  label = "Nueva página",
}: {
  workspaceId: string;
  parentId?: string | null;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      onClick={() =>
        startTransition(() => createPageAction({ workspaceId, parentId }))
      }
      disabled={pending}
      size="sm"
    >
      <Plus className="size-4" />
      {label}
    </Button>
  );
}
