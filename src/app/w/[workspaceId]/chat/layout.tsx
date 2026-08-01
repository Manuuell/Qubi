import { getCurrentUser } from "@/lib/auth";
import { listConversations } from "@/server/services/chat";
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
  const conversations = await listConversations(workspaceId, user.id);

  return (
    <ChatShell workspaceId={workspaceId} conversations={conversations}>
      {children}
    </ChatShell>
  );
}
