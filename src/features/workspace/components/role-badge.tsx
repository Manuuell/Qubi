import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: "Propietario",
  ADMIN: "Admin",
  MEMBER: "Miembro",
  GUEST: "Invitado",
};

const ROLE_CLASS: Record<WorkspaceRole, string> = {
  OWNER:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MEMBER: "bg-muted text-muted-foreground",
  GUEST: "bg-muted/50 text-muted-foreground/70",
};

export function RoleBadge({
  role,
  className,
}: {
  role: WorkspaceRole;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[11px] font-medium",
        ROLE_CLASS[role],
        className,
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}
