import { prisma } from "@/lib/db";
import { IssueStatus } from "@/generated/prisma/enums";

async function assertWorkspaceMember(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new Error("Sin acceso a este espacio de trabajo");
}

export function listIssues(workspaceId: string, status?: IssueStatus) {
  return prisma.issue.findMany({
    where: { workspaceId, ...(status ? { status } : {}) },
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      createdAt: true,
      author: { select: { name: true, email: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { number: "desc" },
  });
}

export async function countIssuesByStatus(workspaceId: string) {
  const [open, closed] = await Promise.all([
    prisma.issue.count({ where: { workspaceId, status: "OPEN" } }),
    prisma.issue.count({ where: { workspaceId, status: "CLOSED" } }),
  ]);
  return { open, closed };
}

export async function createIssue(
  workspaceId: string,
  userId: string,
  title: string,
  body = "",
) {
  await assertWorkspaceMember(workspaceId, userId);
  // Número secuencial por espacio.
  const last = await prisma.issue.findFirst({
    where: { workspaceId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return prisma.issue.create({
    data: {
      workspaceId,
      number: (last?.number ?? 0) + 1,
      title: title.trim() || "Sin título",
      body,
      authorId: userId,
    },
  });
}

// Detalle por número (#n) dentro de un espacio, con autor, responsable y comentarios.
export async function getIssueByNumber(
  workspaceId: string,
  number: number,
  userId: string,
) {
  await assertWorkspaceMember(workspaceId, userId);
  return prisma.issue.findUnique({
    where: { workspaceId_number: { workspaceId, number } },
    include: {
      author: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}

export async function setIssueStatus(
  issueId: string,
  userId: string,
  status: IssueStatus,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { workspaceId: true },
  });
  if (!issue) throw new Error("Issue no encontrado");
  await assertWorkspaceMember(issue.workspaceId, userId);
  return prisma.issue.update({ where: { id: issueId }, data: { status } });
}

export async function setIssueAssignee(
  issueId: string,
  userId: string,
  assigneeId: string | null,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { workspaceId: true },
  });
  if (!issue) throw new Error("Issue no encontrado");
  await assertWorkspaceMember(issue.workspaceId, userId);
  return prisma.issue.update({ where: { id: issueId }, data: { assigneeId } });
}

export async function addIssueComment(
  issueId: string,
  userId: string,
  body: string,
) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { workspaceId: true },
  });
  if (!issue) throw new Error("Issue no encontrado");
  await assertWorkspaceMember(issue.workspaceId, userId);
  return prisma.issueComment.create({
    data: { issueId, authorId: userId, body: body.trim() },
  });
}
