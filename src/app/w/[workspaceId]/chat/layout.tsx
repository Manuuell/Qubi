import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/server/services/chat";
import { getWorkspaceMembers } from "@/server/services/member";
import { ChatShell } from "@/features/chat/components/chat-shell";

export default async function ChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const user = await getCurrentUser();
  const [conversations, workspaceMembers] = await Promise.all([
    listConversations(workspaceId, user.id),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <ChatShell
      workspaceId={workspaceId}
      conversations={conversations}
      members={workspaceMembers
        .filter((m) => m.userId !== user.id)
        .map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
        }))}
    >
      {children}
    </ChatShell>
  );
}
