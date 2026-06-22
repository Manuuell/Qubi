import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getArchivedPages } from "@/server/services/page";
import { TrashList } from "@/features/page/components/trash-list";

export default async function TrashPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const archived = await getArchivedPages(workspaceId);

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Papelera</h1>
      <TrashList
        workspaceId={workspaceId}
        items={archived.map((a) => ({ id: a.id, title: a.title }))}
      />
    </div>
  );
}
