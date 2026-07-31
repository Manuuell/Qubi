import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-12 sm:py-16">
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full">
          <Trash2 className="size-5.5" />
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Papelera
        </h1>
      </div>
      <TrashList
        workspaceId={workspaceId}
        items={archived.map((a) => ({ id: a.id, title: a.title }))}
      />
    </div>
  );
}
