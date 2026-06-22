import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getPageTree } from "@/server/services/page";
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

  const pages = await getPageTree(workspaceId);

  return (
    <div className="flex h-screen">
      <Sidebar
        workspace={{
          id: workspace.id,
          name: workspace.name,
          icon: workspace.icon,
        }}
        pages={pages}
        userName={user.name ?? user.email}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
