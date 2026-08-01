import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateProjectConversation } from "@/server/services/chat";

// Punto de entrada desde la página del proyecto ("Chat del proyecto"): crea
// el canal grupal si todavía no existe (y une al usuario) y redirige a la
// conversación ya creada, que vive en /chat/[conversationId] como cualquier otra.
export default async function ProjectChatEntryPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await params;
  const user = await getCurrentUser();
  const conversation = await getOrCreateProjectConversation(projectId, user.id);
  redirect(`/w/${workspaceId}/chat/${conversation.id}`);
}
