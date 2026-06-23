"use client";

import { useTransition } from "react";
import { CircleCheck, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setIssueStatusAction } from "@/server/actions/issue";

export function IssueStatusButton({
  issueId,
  workspaceId,
  number,
  status,
}: {
  issueId: string;
  workspaceId: string;
  number: number;
  status: "OPEN" | "CLOSED";
}) {
  const [pending, startTransition] = useTransition();
  const isOpen = status === "OPEN";

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(() =>
          setIssueStatusAction({
            issueId,
            workspaceId,
            number,
            status: isOpen ? "CLOSED" : "OPEN",
          }),
        )
      }
    >
      {isOpen ? (
        <>
          <CircleCheck className="size-4" />
          Cerrar issue
        </>
      ) : (
        <>
          <CircleDot className="size-4" />
          Reabrir
        </>
      )}
    </Button>
  );
}
