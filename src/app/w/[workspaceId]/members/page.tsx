import { notFound } from "next/navigation";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getWorkspaceMembers } from "@/server/services/member";
import { MembersManager } from "@/features/workspace/components/members-manager";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();

  const workspace = await getWorkspace(workspaceId, user.id);
  if (!workspace) notFound();

  const members = await getWorkspaceMembers(workspaceId);

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Miembros</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Invita personas por email. La autenticación real llega en la fase final;
        por ahora se crea la cuenta vinculada para que ya puedan formar parte
        del espacio.
      </p>
      <MembersManager
        workspaceId={workspaceId}
        members={members.map((m) => ({
          userId: m.userId,
          role: m.role,
          email: m.user.email,
          name: m.user.name,
          isOwner: m.role === WorkspaceRole.OWNER,
        }))}
      />
    </div>
  );
}
