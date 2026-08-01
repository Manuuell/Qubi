"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import * as chat from "@/server/services/chat";
import { uploadFile } from "@/lib/storage";
import { checkRateLimit } from "@/server/lib/rate-limit";

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

export async function startDirectConversationAction(input: {
  workspaceId: string;
  otherUserId: string;
}) {
  const user = await getCurrentUser();
  const conversation = await chat.getOrCreateDirectConversation(
    input.workspaceId,
    user.id,
    input.otherUserId,
  );
  redirect(`/w/${input.workspaceId}/chat/${conversation.id}`);
}

export async function sendChatMessageAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const body = String(formData.get("body") ?? "");
  const file = formData.get("file");

  let attachmentUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("El adjunto no puede superar 8 MB.");
    }
    attachmentUrl = await uploadFile(file);
  }

  const user = await getCurrentUser();

  const rateLimit = checkRateLimit(`chat-send:${user.id}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) {
    throw new Error("Estás enviando mensajes muy rápido. Espera un momento.");
  }

  await chat.sendMessage(conversationId, user.id, body, attachmentUrl);
  revalidatePath(`/w/${workspaceId}/chat/${conversationId}`);
  revalidatePath(`/w/${workspaceId}/chat`, "layout");
}

export async function markConversationReadAction(input: {
  conversationId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await chat.markConversationRead(input.conversationId, user.id);
  revalidatePath(`/w/${input.workspaceId}/chat`, "layout");
}

export async function toggleMessageReactionAction(input: {
  messageId: string;
  emoji: string;
}) {
  const user = await getCurrentUser();
  return chat.toggleMessageReaction(input.messageId, user.id, input.emoji);
}
