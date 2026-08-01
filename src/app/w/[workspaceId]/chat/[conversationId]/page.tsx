import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConversation, listMessages } from "@/server/services/chat";
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

  const messages = await listMessages(conversationId, user.id);

  return (
    <ChatThread
      workspaceId={workspaceId}
      conversationId={conversationId}
      currentUserId={user.id}
      otherUser={conversation.otherUser}
      initialMessages={messages}
    />
  );
}
