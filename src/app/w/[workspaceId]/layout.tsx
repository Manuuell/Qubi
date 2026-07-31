import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace, getUserWorkspaces } from "@/server/services/workspace";
import { getPageTree, getFavoritePages } from "@/server/services/page";
import { listProjects } from "@/server/services/project";
import { getInbox } from "@/server/services/notification";
import { getRunningTimer } from "@/server/services/time";
import { readRing } from "@/server/account-ring";
import { Sidebar } from "@/features/workspace/components/sidebar";
import { MobileTopbar } from "@/features/workspace/components/mobile-topbar";
import { MobileSidebarProvider } from "@/features/workspace/components/mobile-sidebar-context";
import { OnboardingProvider } from "@/features/onboarding/onboarding-context";
import { TimerWidgetProvider } from "@/features/time/timer-widget-context";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const [pages, workspaces, favorites, projects, ring, inbox, runningTimer] =
    await Promise.all([
      getPageTree(workspaceId),
      getUserWorkspaces(user.id),
      getFavoritePages(user.id, workspaceId),
      listProjects(workspaceId),
      readRing(),
      getInbox({ id: user.id, email: user.email }),
      getRunningTimer(user.id),
    ]);

  // Otras cuentas recordadas en este navegador (excluye la activa).
  const accounts = ring
    .filter((e) => e.userId !== user.id)
    .map((e) => ({ userId: e.userId, name: e.name, email: e.email }));

  return (
    <div className="bg-board bg-background flex h-screen gap-2 p-2">
      <TimerWidgetProvider initialTimer={runningTimer}>
        <MobileSidebarProvider>
          <OnboardingProvider userId={user.id}>
            <Sidebar
              workspace={{
                id: workspace.id,
                name: workspace.name,
                icon: workspace.icon,
                isOwner: workspace.ownerId === user.id,
              }}
              workspaces={workspaces.map((w) => ({
                id: w.id,
                name: w.name,
                icon: w.icon,
                isOwner: w.ownerId === user.id,
              }))}
              pages={pages}
              projects={projects}
              favorites={favorites.map((p) => ({
                id: p.id,
                title: p.title,
                type: p.type,
              }))}
              userName={user.name ?? user.email}
              userEmail={user.email}
              accounts={accounts}
              inbox={inbox}
            />
            <main className="bg-card flex min-w-0 flex-1 flex-col overflow-y-auto rounded-3xl shadow-xs">
              <div className="p-2 md:hidden">
                <MobileTopbar workspaceName={workspace.name} />
              </div>
              <div className="min-h-0 flex-1">{children}</div>
            </main>
          </OnboardingProvider>
        </MobileSidebarProvider>
      </TimerWidgetProvider>
    </div>
  );
}
