import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace, getUserWorkspaces } from "@/server/services/workspace";
import { getPageTree, getFavoritePages } from "@/server/services/page";
import { listProjects } from "@/server/services/project";
import { getInbox } from "@/server/services/notification";
import { readRing } from "@/server/account-ring";
import { Sidebar } from "@/features/workspace/components/sidebar";

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

  const [pages, workspaces, favorites, projects, ring, inbox] =
    await Promise.all([
      getPageTree(workspaceId),
      getUserWorkspaces(user.id),
      getFavoritePages(user.id, workspaceId),
      listProjects(workspaceId),
      readRing(),
      getInbox({ id: user.id, email: user.email }),
    ]);

  // Otras cuentas recordadas en este navegador (excluye la activa).
  const accounts = ring
    .filter((e) => e.userId !== user.id)
    .map((e) => ({ userId: e.userId, name: e.name, email: e.email }));

  return (
    <div className="flex h-screen">
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
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
