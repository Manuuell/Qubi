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
  HelpCircle,
  Home,
  MessageCircle,
  Plus,
  Star,
  Table,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageTreeItem } from "@/server/services/page";
import type { ProjectListItem } from "@/server/services/project";
import { archivePageAction, createPageAction } from "@/server/actions/page";
import { createDatabaseAction } from "@/server/actions/database";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/features/search/components/command-palette";
import { NewPageButton } from "@/features/page/components/new-page-button";
import { CreateProjectButton } from "@/features/project/components/create-project-button";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { AccountMenu } from "@/features/workspace/components/account-menu";
import { NotificationBell } from "@/features/notification/components/notification-bell";
import type { Inbox } from "@/server/services/notification";
import { useOnboarding } from "@/features/onboarding/onboarding-context";
import { useMobileSidebar } from "@/features/workspace/components/mobile-sidebar-context";

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
  inbox,
  chatUnreadCount = 0,
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
  inbox: Inbox;
  chatUnreadCount?: number;
}) {
  const tree = buildTree(pages);
  const pageTree = tree.filter((n) => n.type !== "DATABASE");
  const databaseTree = tree.filter((n) => n.type === "DATABASE");
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const { start: startTour } = useOnboarding();
  const { open, setOpen } = useMobileSidebar();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "glass fixed inset-y-2 left-2 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col rounded-3xl p-2 transition-transform duration-300 md:static md:inset-auto md:z-auto md:w-64 md:max-w-none md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
        )}
      >
        <div className="flex items-center gap-1 md:hidden">
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="text-muted-foreground hover:bg-accent transition-ios grid size-9 shrink-0 place-items-center rounded-full"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="hidden md:block">
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
        </div>

        <div className="mt-1 space-y-0.5 px-1">
          <div data-tour="tour-search">
            <CommandPalette />
          </div>
          <Link
            href={`/w/${workspace.id}`}
            data-tour="tour-home"
            onClick={() => setOpen(false)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
              pathname === `/w/${workspace.id}` && "bg-primary/10 text-primary",
            )}
          >
            <Home className="size-4" />
            Inicio
          </Link>
          <div data-tour="tour-create" className="space-y-0.5">
            <CreateProjectButton workspaceId={workspace.id} />
            <NewPageButton workspaceId={workspace.id} />
            <button
              onClick={() =>
                startTransition(() =>
                  createDatabaseAction({ workspaceId: workspace.id }),
                )
              }
              disabled={pending}
              className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
            >
              <Table className="size-4" />
              Nueva base de datos
            </button>
          </div>
        </div>

        <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-1 pb-4">
          <Link
            href={`/w/${workspace.id}/agenda`}
            data-tour="tour-agenda"
            onClick={() => setOpen(false)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
              pathname === `/w/${workspace.id}/agenda` &&
                "bg-primary/10 text-primary",
            )}
          >
            <CalendarCheck className="size-4" />
            Mi agenda
          </Link>

          <div data-tour="tour-projects" className="mt-3 mb-3">
            <p className="text-muted-foreground px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
              Proyectos
            </p>
            {projects.length === 0 ? (
              <p className="text-muted-foreground px-3 py-2 text-xs">
                Sin proyectos todavía.
              </p>
            ) : (
              projects.map((p) => {
                const href = `/w/${workspace.id}/projects/${p.id}`;
                const active = pathname === href;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
                      active && "bg-primary/10 text-primary",
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
              <p className="text-muted-foreground px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
                Favoritos
              </p>
              {favorites.map((f) => (
                <Link
                  key={f.id}
                  href={`/w/${workspace.id}/${f.id}`}
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
                >
                  <Star className="text-gold size-3.5 shrink-0 fill-current" />
                  <span className="truncate">{f.title || "Sin título"}</span>
                </Link>
              ))}
            </div>
          )}

          <p className="text-muted-foreground px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
            Páginas
          </p>
          {pageTree.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-xs">
              Sin páginas todavía.
            </p>
          ) : (
            pageTree.map((node) => (
              <PageRow
                key={node.id}
                node={node}
                workspaceId={workspace.id}
                depth={0}
              />
            ))
          )}

          <p className="text-muted-foreground mt-3 px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
            Bases de datos
          </p>
          {databaseTree.length === 0 ? (
            <p className="text-muted-foreground px-3 py-4 text-xs">
              Sin bases de datos todavía.
            </p>
          ) : (
            databaseTree.map((node) => (
              <PageRow
                key={node.id}
                node={node}
                workspaceId={workspace.id}
                depth={0}
              />
            ))
          )}
        </nav>

        <div className="border-border/60 mt-auto space-y-0.5 border-t p-1 pt-2 text-sm">
          <Link
            href={`/w/${workspace.id}/chat`}
            onClick={() => setOpen(false)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5",
              pathname.startsWith(`/w/${workspace.id}/chat`) &&
                "bg-primary/10 text-primary",
            )}
          >
            <MessageCircle className="size-4" />
            Chat
            {chatUnreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground ml-auto grid min-w-4.5 place-items-center rounded-full px-1 text-[10px] leading-4 font-medium">
                {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
              </span>
            )}
          </Link>
          <Link
            href={`/w/${workspace.id}/hours`}
            data-tour="tour-hours"
            onClick={() => setOpen(false)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5",
              pathname === `/w/${workspace.id}/hours` &&
                "bg-primary/10 text-primary",
            )}
          >
            <Clock className="size-4" />
            Registro de horas
          </Link>
          <Link
            href={`/w/${workspace.id}/members`}
            data-tour="tour-members"
            onClick={() => setOpen(false)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5",
              pathname === `/w/${workspace.id}/members` &&
                "bg-primary/10 text-primary",
            )}
          >
            <Users className="size-4" />
            Miembros
          </Link>
          <Link
            href={`/w/${workspace.id}/trash`}
            onClick={() => setOpen(false)}
            className={cn(
              "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5",
              pathname === `/w/${workspace.id}/trash` &&
                "bg-primary/10 text-primary",
            )}
          >
            <Trash2 className="size-4" />
            Papelera
          </Link>

          <div
            data-tour="tour-account"
            className="border-border/60 mt-2 flex items-center gap-2 border-t px-1 pt-2"
          >
            <span className="bg-primary/10 text-primary grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs">{userName}</span>
            <button
              onClick={startTour}
              aria-label="Ver guía de bienvenida"
              data-tour="tour-help"
              className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-7 shrink-0 place-items-center rounded-full"
            >
              <HelpCircle className="size-4" />
            </button>
            <NotificationBell inbox={inbox} />
            <ThemeToggle />
            <AccountMenu
              current={{ name: userName, email: userEmail }}
              accounts={accounts}
            />
          </div>
        </div>
      </aside>
    </>
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
  const { setOpen } = useMobileSidebar();

  const href = `/w/${workspaceId}/${node.id}`;
  const isActive = pathname === href;
  const hasChildren = node.children.length > 0;
  const Icon = node.type === "DATABASE" ? Database : FileText;

  return (
    <div>
      <div
        className={cn(
          "group hover:bg-accent transition-ios flex items-center gap-1 rounded-full pr-1 text-sm",
          isActive && "bg-primary/10 text-primary",
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
          onClick={() => setOpen(false)}
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
