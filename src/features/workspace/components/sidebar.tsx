"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Database,
  FileText,
  LogOut,
  Plus,
  Table,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageTreeItem } from "@/server/services/page";
import { archivePageAction, createPageAction } from "@/server/actions/page";
import { createDatabaseAction } from "@/server/actions/database";
import { logoutAction } from "@/server/actions/auth";

type TreeNode = PageTreeItem & { children: TreeNode[] };

function buildTree(pages: PageTreeItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const p of pages) map.set(p.id, { ...p, children: [] });

  const roots: TreeNode[] = [];
  for (const p of pages) {
    const node = map.get(p.id)!;
    const parent = p.parentId ? map.get(p.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function Sidebar({
  workspace,
  pages,
  userName,
}: {
  workspace: { id: string; name: string; icon: string | null };
  pages: PageTreeItem[];
  userName: string;
}) {
  const tree = buildTree(pages);
  const [pending, startTransition] = useTransition();

  return (
    <aside className="bg-muted/30 flex h-full w-64 shrink-0 flex-col border-r">
      <div className="flex items-center gap-2 px-3 py-3 text-sm font-semibold">
        <span className="bg-primary/10 grid size-6 place-items-center rounded text-xs">
          {workspace.icon ?? "Q"}
        </span>
        <span className="truncate">{workspace.name}</span>
      </div>

      <div className="px-2">
        <button
          onClick={() =>
            startTransition(() =>
              createPageAction({ workspaceId: workspace.id }),
            )
          }
          disabled={pending}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors disabled:opacity-50"
        >
          <Plus className="size-4" />
          Nueva página
        </button>
        <button
          onClick={() =>
            startTransition(() =>
              createDatabaseAction({ workspaceId: workspace.id }),
            )
          }
          disabled={pending}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors disabled:opacity-50"
        >
          <Table className="size-4" />
          Nueva base de datos
        </button>
      </div>

      <nav className="mt-1 flex-1 overflow-y-auto px-2 pb-4">
        {tree.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-xs">
            Sin páginas todavía.
          </p>
        ) : (
          tree.map((node) => (
            <PageRow
              key={node.id}
              node={node}
              workspaceId={workspace.id}
              depth={0}
            />
          ))
        )}
      </nav>

      <div className="mt-auto border-t p-2 text-sm">
        <Link
          href={`/w/${workspace.id}/members`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        >
          <Users className="size-4" />
          Miembros
        </Link>
        <Link
          href={`/w/${workspace.id}/trash`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        >
          <Trash2 className="size-4" />
          Papelera
        </Link>

        <div className="mt-2 flex items-center gap-2 border-t pt-2">
          <span className="bg-primary/10 grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium">
            {userName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs">{userName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              className="text-muted-foreground hover:bg-accent hover:text-foreground grid size-7 place-items-center rounded"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function PageRow({
  node,
  workspaceId,
  depth,
}: {
  node: TreeNode;
  workspaceId: string;
  depth: number;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [pending, startTransition] = useTransition();

  const href = `/w/${workspaceId}/${node.id}`;
  const isActive = pathname === href;
  const hasChildren = node.children.length > 0;
  const Icon = node.type === "DATABASE" ? Database : FileText;

  return (
    <div>
      <div
        className={cn(
          "group hover:bg-accent flex items-center gap-1 rounded-md pr-1 text-sm transition-colors",
          isActive && "bg-accent",
        )}
        style={{ paddingLeft: depth * 12 }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:bg-accent-foreground/10 grid size-5 shrink-0 place-items-center rounded"
          aria-label={expanded ? "Contraer" : "Expandir"}
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              hasChildren ? "opacity-100" : "opacity-0",
              expanded && "rotate-90",
            )}
          />
        </button>

        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5"
        >
          <Icon className="text-muted-foreground size-4 shrink-0" />
          <span className="truncate">{node.title || "Sin título"}</span>
        </Link>

        <button
          onClick={() =>
            startTransition(() =>
              createPageAction({ workspaceId, parentId: node.id }),
            )
          }
          disabled={pending}
          className="text-muted-foreground hover:bg-accent-foreground/10 grid size-6 shrink-0 place-items-center rounded opacity-0 group-hover:opacity-100"
          aria-label="Añadir subpágina"
        >
          <Plus className="size-3.5" />
        </button>

        <button
          onClick={() =>
            startTransition(() =>
              archivePageAction({ pageId: node.id, workspaceId }),
            )
          }
          disabled={pending}
          className="text-muted-foreground hover:bg-accent-foreground/10 grid size-6 shrink-0 place-items-center rounded opacity-0 group-hover:opacity-100"
          aria-label="Mover a la papelera"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {expanded &&
        node.children.map((child) => (
          <PageRow
            key={child.id}
            node={child}
            workspaceId={workspaceId}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
