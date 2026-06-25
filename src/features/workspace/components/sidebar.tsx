"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Plus,
  Star,
  Table,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageTreeItem } from "@/server/services/page";
import type { ProjectListItem } from "@/server/services/project";
import { archivePageAction, createPageAction } from "@/server/actions/page";
import { createDatabaseAction } from "@/server/actions/database";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/features/search/components/command-palette";
import { CreateProjectButton } from "@/features/project/components/create-project-button";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { AccountMenu } from "@/features/workspace/components/account-menu";

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
  workspaces,
  pages,
  projects,
  favorites,
  userName,
  userEmail,
  accounts,
}: {
  workspace: {
    id: string;
    name: string;
    icon: string | null;
    isOwner: boolean;
  };
  workspaces: {
    id: string;
    name: string;
    icon: string | null;
    isOwner: boolean;
  }[];
  pages: PageTreeItem[];
  projects: ProjectListItem[];
  favorites: { id: string; title: string; type: "PAGE" | "DATABASE" }[];
  userName: string;
  userEmail: string;
  accounts: { userId: string; name: string | null; email: string }[];
}) {
  const tree = buildTree(pages);
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <aside className="bg-muted/30 flex h-full w-64 shrink-0 flex-col border-r">
      <WorkspaceSwitcher current={workspace} workspaces={workspaces} />

      <div className="mt-1 px-2">
        <CommandPalette />
        <CreateProjectButton workspaceId={workspace.id} />
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
        <Link
          href={`/w/${workspace.id}/agenda`}
          className={cn(
            "hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
            pathname === `/w/${workspace.id}/agenda` && "bg-accent",
          )}
        >
          <CalendarCheck className="size-4" />
          Mi agenda
        </Link>

        <div className="mt-3 mb-3">
          <p className="text-muted-foreground px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
            Proyectos
          </p>
          {projects.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              Sin proyectos todavía.
            </p>
          ) : (
            projects.map((p) => {
              const href = `/w/${workspace.id}/projects/${p.id}`;
              return (
                <Link
                  key={p.id}
                  href={href}
                  className={cn(
                    "hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    pathname === href && "bg-accent",
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: p.color ?? "#888888" }}
                  />
                  <span className="truncate">{p.name || "Sin nombre"}</span>
                </Link>
              );
            })
          )}
        </div>

        {favorites.length > 0 && (
          <div className="mb-3">
            <p className="text-muted-foreground px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
              Favoritos
            </p>
            {favorites.map((f) => (
              <Link
                key={f.id}
                href={`/w/${workspace.id}/${f.id}`}
                className="hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm"
              >
                <Star className="text-gold size-3.5 shrink-0 fill-current" />
                <span className="truncate">{f.title || "Sin título"}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="text-muted-foreground px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
          Páginas
        </p>
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
          href={`/w/${workspace.id}/hours`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        >
          <Clock className="size-4" />
          Registro de horas
        </Link>
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
          <ThemeToggle />
          <AccountMenu
            current={{ name: userName, email: userEmail }}
            accounts={accounts}
          />
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
