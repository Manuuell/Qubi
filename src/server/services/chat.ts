import { prisma } from "@/lib/db";
import { assertWorkspaceMember } from "@/server/lib/permissions";
import { getProject } from "@/server/services/project";
import { publishToUser } from "@/server/lib/event-bus";
import { QUICK_REACTIONS } from "@/features/task/labels";
import { extractMentionedUserIds } from "@/features/mentions/mentions";
import { notifyMentionedInChat } from "@/server/services/notification";

const personSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

// Chat 1 a 1 dentro de un workspace. Cada par de personas tiene una única
// conversación (se busca antes de crear una nueva).
export async function getOrCreateDirectConversation(
  workspaceId: string,
  userId: string,
  otherUserId: string,
) {
  if (userId === otherUserId)
    throw new Error("No puedes chatear contigo mismo.");
  await assertWorkspaceMember(workspaceId, userId);
  await assertWorkspaceMember(workspaceId, otherUserId);

  const candidates = await prisma.conversation.findMany({
    where: {
      workspaceId,
      type: "DIRECT",
      participants: { some: { userId } },
      AND: { participants: { some: { userId: otherUserId } } },
    },
    include: { participants: true },
  });
  const existing = candidates.find((c) => c.participants.length === 2);
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      workspaceId,
      type: "DIRECT",
      participants: { create: [{ userId }, { userId: otherUserId }] },
    },
  });
}

// Canal grupal del proyecto: uno solo por proyecto (projectId es único). Se
// crea la primera vez que alguien entra, y cada visitante se une como
// participante en ese momento (canal abierto a todo el proyecto, no exige
// invitación explícita).
export async function getOrCreateProjectConversation(
  projectId: string,
  userId: string,
) {
  const project = await getProject(projectId, userId);
  if (!project) throw new Error("Proyecto no encontrado");

  const conversation = await prisma.conversation.upsert({
    where: { projectId },
    create: {
      workspaceId: project.workspaceId,
      type: "GROUP",
      name: project.name,
      projectId,
      participants: { create: [{ userId }] },
    },
    update: {},
  });

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: { conversationId: conversation.id, userId },
    },
    create: { conversationId: conversation.id, userId },
    update: {},
  });

  return conversation;
}

// Grupo creado a mano (a diferencia del canal automático por proyecto):
// nombre elegido y participantes seleccionados por quien lo crea.
export async function createGroupConversation(
  workspaceId: string,
  creatorId: string,
  memberIds: string[],
  name: string,
) {
  await assertWorkspaceMember(workspaceId, creatorId);
  const ids = [...new Set([creatorId, ...memberIds])];
  for (const id of ids) await assertWorkspaceMember(workspaceId, id);
  if (ids.length < 2) {
    throw new Error("Elige al menos otra persona para el grupo.");
  }

  return prisma.conversation.create({
    data: {
      workspaceId,
      type: "GROUP",
      name: name.trim() || "Grupo",
      participants: { create: ids.map((userId) => ({ userId })) },
    },
  });
}

export async function renameConversation(
  conversationId: string,
  userId: string,
  name: string,
) {
  await assertParticipant(conversationId, userId);
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
  });
  if (conversation.type !== "GROUP") {
    throw new Error("Solo los grupos se pueden renombrar.");
  }
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { name: name.trim() || conversation.name },
  });
}

// Sale de la conversación (grupo) o la quita de la lista propia (chat 1 a
// 1): borra solo la fila de participación del usuario, los mensajes quedan
// intactos para el resto.
export async function leaveConversation(
  conversationId: string,
  userId: string,
) {
  await assertParticipant(conversationId, userId);
  await prisma.conversationParticipant.delete({
    where: { conversationId_userId: { conversationId, userId } },
  });
}

export type ConversationListItem = {
  id: string;
  kind: "DIRECT" | "GROUP";
  title: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  lastMessage: {
    body: string;
    createdAt: Date;
    senderId: string | null;
  } | null;
  unreadCount: number;
};

export async function listConversations(
  workspaceId: string,
  userId: string,
): Promise<ConversationListItem[]> {
  await assertWorkspaceMember(workspaceId, userId);
  const conversations = await prisma.conversation.findMany({
    where: { workspaceId, participants: { some: { userId } } },
    include: {
      participants: { include: { user: { select: personSelect } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    conversations.map(async (c) => {
      const me = c.participants.find((p) => p.userId === userId);
      const other = c.participants.find((p) => p.userId !== userId);
      if (c.type === "DIRECT" && !other) return null;

      const unreadCount = await prisma.chatMessage.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          createdAt: { gt: me?.lastReadAt ?? new Date(0) },
        },
      });
      return {
        id: c.id,
        kind: c.type,
        title: c.type === "GROUP" ? (c.name ?? "Canal del proyecto") : "",
        otherUser: c.type === "DIRECT" ? (other?.user ?? null) : null,
        lastMessage: c.messages[0]
          ? {
              body: c.messages[0].body,
              createdAt: c.messages[0].createdAt,
              senderId: c.messages[0].senderId,
            }
          : null,
        unreadCount,
      };
    }),
  );
  return rows
    .filter((r): r is ConversationListItem => r !== null)
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt.getTime() ?? 0;
      const bt = b.lastMessage?.createdAt.getTime() ?? 0;
      return bt - at;
    });
}

export async function getUnreadChatCount(workspaceId: string, userId: string) {
  const memberships = await prisma.conversationParticipant.findMany({
    where: { userId, conversation: { workspaceId } },
    select: { conversationId: true, lastReadAt: true },
  });
  if (memberships.length === 0) return 0;
  const counts = await Promise.all(
    memberships.map((m) =>
      prisma.chatMessage.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: userId },
          createdAt: { gt: m.lastReadAt ?? new Date(0) },
        },
      }),
    ),
  );
  return counts.reduce((a, b) => a + b, 0);
}

async function assertParticipant(conversationId: string, userId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!p) throw new Error("No participas en esta conversación.");
  return p;
}

export async function getConversation(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      participants: { include: { user: { select: personSelect } } },
      project: { select: { id: true, name: true } },
    },
  });
  const other = conversation.participants.find((p) => p.userId !== userId);
  return {
    id: conversation.id,
    workspaceId: conversation.workspaceId,
    kind: conversation.type,
    title:
      conversation.type === "GROUP"
        ? (conversation.name ??
          conversation.project?.name ??
          "Canal del proyecto")
        : "",
    project: conversation.project,
    otherUser: conversation.type === "DIRECT" ? (other?.user ?? null) : null,
    members:
      conversation.type === "GROUP"
        ? conversation.participants.map((p) => p.user)
        : [],
  };
}

const messageInclude = {
  sender: { select: personSelect },
  reactions: { include: { user: { select: personSelect } } },
} as const;

export async function listMessages(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  return prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });
}

// Mensajes posteriores a `after` (para polling incremental desde el cliente).
export async function listMessagesSince(
  conversationId: string,
  userId: string,
  after: Date,
) {
  await assertParticipant(conversationId, userId);
  return prisma.chatMessage.findMany({
    where: { conversationId, createdAt: { gt: after } },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });
}

// Alterna una reacción propia a un mensaje (agrega si no la tenía, quita si
// ya la tenía). No dispara un evento SSE dedicado: quien reaccionó lo ve al
// instante (actualización optimista en el cliente) y el resto lo ve al
// llegar el próximo mensaje o al reabrir la conversación.
export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string,
) {
  if (!(QUICK_REACTIONS as readonly string[]).includes(emoji)) {
    throw new Error("Reacción no válida");
  }
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) throw new Error("Mensaje no encontrado");
  await assertParticipant(message.conversationId, userId);

  const existing = await prisma.chatMessageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId, emoji } },
  });
  if (existing) {
    await prisma.chatMessageReaction.delete({ where: { id: existing.id } });
    return { added: false };
  }
  await prisma.chatMessageReaction.create({
    data: { messageId, userId, emoji },
  });
  return { added: true };
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  body: string,
  attachmentUrl?: string | null,
) {
  await assertParticipant(conversationId, userId);
  const trimmed = body.trim();
  if (!trimmed && !attachmentUrl) throw new Error("El mensaje está vacío.");
  const message = await prisma.chatMessage.create({
    data: {
      conversationId,
      senderId: userId,
      body: trimmed,
      attachmentUrl: attachmentUrl ?? null,
    },
    include: { sender: { select: personSelect } },
  });
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: message.createdAt },
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  for (const p of participants) {
    publishToUser(p.userId, { type: "chat", conversationId });
  }

  const mentionCandidates = extractMentionedUserIds(trimmed);
  if (mentionCandidates.length > 0) {
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { workspaceId: true },
    });
    // Igual que en comentarios de tareas: solo se notifica a quien de
    // verdad es miembro del workspace.
    const mentioned = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: conversation.workspaceId,
        userId: { in: mentionCandidates },
      },
      select: { userId: true },
    });
    await notifyMentionedInChat(
      conversation.workspaceId,
      conversationId,
      mentioned.map((m) => m.userId),
      userId,
    );
  }

  return message;
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
) {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });
}
