import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConversation, listMessages } from "@/server/services/chat";
import { getWorkspaceMembers } from "@/server/services/member";
import { ChatThread } from "@/features/chat/components/chat-thread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ workspaceId: string; conversationId: string }>;
}) {
  const { workspaceId, conversationId } = await params;
  const user = await getCurrentUser();

  let conversation;
  try {
    conversation = await getConversation(conversationId, user.id);
  } catch {
    notFound();
  }
  if (conversation.workspaceId !== workspaceId) notFound();

  const [messages, workspaceMembers] = await Promise.all([
    listMessages(conversationId, user.id),
    getWorkspaceMembers(workspaceId),
  ]);

  return (
    <ChatThread
      workspaceId={workspaceId}
      conversationId={conversationId}
      currentUserId={user.id}
      kind={conversation.kind}
      title={conversation.title}
      otherUser={conversation.otherUser}
      memberCount={conversation.members.length}
      initialMessages={messages}
      members={workspaceMembers.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      }))}
    />
  );
}
