"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  Clock,
  HelpCircle,
  Home,
  MessageCircle,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/server/services/project";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreateProjectButton } from "@/features/project/components/create-project-button";
import { WorkspaceSwitcher } from "@/features/workspace/components/workspace-switcher";
import { AccountMenu } from "@/features/workspace/components/account-menu";
import { UserPreview } from "@/features/workspace/components/user-preview";
import { NotificationBell } from "@/features/notification/components/notification-bell";
import type { Inbox } from "@/server/services/notification";
import { useOnboarding } from "@/features/onboarding/onboarding-context";
import { useMobileSidebar } from "@/features/workspace/components/mobile-sidebar-context";

export function Sidebar({
  workspace,
  workspaces,
  projects,
  userId,
  userName,
  userEmail,
  userImage,
  accounts,
  inbox,
  chatUnreadCount = 0,
  isManager = false,
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
  projects: ProjectListItem[];
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  accounts: { userId: string; name: string | null; email: string }[];
  inbox: Inbox;
  chatUnreadCount?: number;
  /** OWNER/ADMIN: ve el panel de equipo (producción, horas y avances de todos). */
  isManager?: boolean;
}) {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
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

        {/* Todo el centro del menú va en UNA zona desplazable. Antes el árbol
            de proyectos era el único que scrolleaba y quedaba aplastado entre
            bloques fijos: en pantallas bajas se reducía a unos pocos píxeles y
            los proyectos parecían no existir. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mt-1 space-y-0.5 px-1">
            <Link
              href={`/w/${workspace.id}`}
              data-tour="tour-home"
              onClick={() => setOpen(false)}
              className={cn(
                "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
                pathname === `/w/${workspace.id}` &&
                  "bg-primary/10 text-primary",
              )}
            >
              <Home className="size-4" />
              Inicio
            </Link>
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
            <div data-tour="tour-create" className="space-y-0.5">
              <CreateProjectButton workspaceId={workspace.id} />
            </div>
          </div>

          <nav className="mt-1 space-y-0.5 px-1 pb-2">
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
          </nav>

          <div className="border-border/60 space-y-0.5 border-t p-1 pt-2 text-sm">
            <Link
              href={`/w/${workspace.id}/chat`}
              data-tour="tour-chat"
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
            {/* Panel de equipo: solo OWNER/ADMIN. Hasta ahora únicamente se
              llegaba desde el conmutador del inicio, así que no se encontraba. */}
            {isManager && (
              <Link
                href={`/w/${workspace.id}?view=team`}
                onClick={() => setOpen(false)}
                className={cn(
                  "text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex items-center gap-2 rounded-full px-3 py-1.5",
                  pathname === `/w/${workspace.id}` &&
                    view === "team" &&
                    "bg-primary/10 text-primary",
                )}
              >
                <BarChart3 className="size-4" />
                Equipo
              </Link>
            )}
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
          </div>
        </div>

        <div
          data-tour="tour-account"
          className="border-border/60 mt-auto flex items-center gap-2 border-t px-2 pt-2"
        >
          <div className="min-w-0 flex-1 [&_span]:text-xs">
            <UserPreview
              onNavigate={() => setOpen(false)}
              workspaceId={workspace.id}
              userId={userId}
              name={userName}
              email={userEmail}
              image={userImage}
              currentUserId={userId}
            />
          </div>
          <button
            onClick={startTour}
            aria-label="Ver guía de bienvenida"
            data-tour="tour-help"
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-7 shrink-0 place-items-center rounded-full"
          >
            <HelpCircle className="size-4" />
          </button>
          <NotificationBell inbox={inbox} workspaceId={workspace.id} />
          <ThemeToggle />
          <AccountMenu
            current={{ name: userName, email: userEmail }}
            accounts={accounts}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </aside>
    </>
  );
}
