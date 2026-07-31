"use client";

import { Menu } from "lucide-react";
import { useMobileSidebar } from "./mobile-sidebar-context";

export function MobileTopbar({ workspaceName }: { workspaceName: string }) {
  const { setOpen } = useMobileSidebar();

  return (
    <div className="glass sticky top-0 z-30 mb-2 flex items-center gap-2 rounded-full p-2 md:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="text-muted-foreground hover:bg-accent transition-ios grid size-9 shrink-0 place-items-center rounded-full"
      >
        <Menu className="size-5" />
      </button>
      <span className="truncate text-sm font-semibold">{workspaceName}</span>
    </div>
  );
}
