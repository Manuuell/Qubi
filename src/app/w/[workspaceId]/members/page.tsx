import { notFound } from "next/navigation";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getWorkspaceMembers } from "@/server/services/member";
import { listWorkspacePendingInvites } from "@/server/services/invite";
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

  const [members, invites] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    listWorkspacePendingInvites(workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Miembros</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Invita personas por email. Recibirán la invitación en sus notificaciones
        y se unirán al espacio cuando la acepten.
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
        invites={invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
        }))}
      />
    </div>
  );
}
