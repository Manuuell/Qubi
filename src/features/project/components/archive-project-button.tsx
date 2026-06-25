"use client";

import { useTransition } from "react";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveProjectAction } from "@/server/actions/project";

export function ArchiveProjectButton({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(() => archiveProjectAction({ projectId, workspaceId }))
      }
    >
      <Archive className="size-4" />
      Archivar
    </Button>
  );
}
