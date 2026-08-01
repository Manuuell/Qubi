import { prisma } from "@/lib/db";
import { assertWorkspaceMember } from "@/server/lib/permissions";
import { getProject } from "@/server/services/project";
import { publishToUser } from "@/server/lib/event-bus";

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

export async function listMessages(conversationId: string, userId: string) {
  await assertParticipant(conversationId, userId);
  return prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: personSelect } },
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
    include: { sender: { select: personSelect } },
  });
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
