import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/server/services/workspace";
import { getWorkspaceMembers } from "@/server/services/member";
import { listWorkspacePendingInvites } from "@/server/services/invite";
import { getInviteLinkToken } from "@/server/services/invite-link";
import { isAdminRole } from "@/server/lib/permissions";
import { getBaseUrl } from "@/lib/mail";
import { joinUrl } from "@/lib/join-token";
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

  const currentMember = members.find((m) => m.userId === user.id);
  if (!currentMember) notFound();

  const isAdmin = isAdminRole(currentMember.role);
  const token = isAdmin ? await getInviteLinkToken(workspaceId, user.id) : null;
  const inviteUrl = token ? joinUrl(await getBaseUrl(), token) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-12 sm:py-16">
      <h1 className="font-heading mb-2 text-3xl font-bold tracking-tight">
        Miembros
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Invita personas por email o con un enlace. Por email reciben la
        invitación en sus notificaciones; con el enlace se unen al instante como
        miembros.
      </p>
      <MembersManager
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        inviteUrl={inviteUrl}
        currentUserId={user.id}
        currentUserRole={currentMember.role}
        members={members.map((m) => ({
          userId: m.userId,
          role: m.role,
          email: m.user.email,
          name: m.user.name,
          image: m.user.image,
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
