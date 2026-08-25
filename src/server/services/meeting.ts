import { prisma } from "@/lib/db";
import { notifyMeetingInvited } from "@/server/services/notification";
import {
  assertWorkspaceMember,
  getWorkspaceRole,
  isAdminRole,
} from "@/server/lib/permissions";

const personSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

async function assertMeetingAccess(meetingId: string, userId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: { workspaceId: true, organizerId: true },
  });
  if (!meeting) throw new Error("Reunión no encontrada");
  await assertWorkspaceMember(meeting.workspaceId, userId);
  return meeting;
}

// Solo quien organizó la reunión, o un admin del espacio (red de seguridad
// si el organizador perdió el acceso). La UI solo le muestra el botón de
// cancelar al organizador; el chequeo de admin queda como respaldo del lado
// del servidor.
async function assertCanCancelMeeting(meetingId: string, userId: string) {
  const meeting = await assertMeetingAccess(meetingId, userId);
  if (meeting.organizerId === userId) return meeting;
  const role = await getWorkspaceRole(meeting.workspaceId, userId);
  if (!isAdminRole(role)) {
    throw new Error(
      "Solo quien organizó la reunión (o un administrador) puede cancelarla",
    );
  }
  return meeting;
}

export async function createMeeting(input: {
  workspaceId: string;
  organizerId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: Date;
  endAt: Date;
  attendeeIds: string[];
}) {
  await assertWorkspaceMember(input.workspaceId, input.organizerId);
  const title = input.title.trim();
  if (!title) throw new Error("El título es obligatorio");
  if (input.endAt <= input.startAt) {
    throw new Error("La hora de fin debe ser posterior a la de inicio");
  }

  // Igual que con los responsables de una tarea: solo miembros reales del
  // espacio pueden quedar como invitados.
  const validMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: input.workspaceId,
      userId: { in: input.attendeeIds },
    },
    select: { userId: true },
  });
  const attendeeIds = [...new Set(validMembers.map((m) => m.userId))];

  const meeting = await prisma.meeting.create({
    data: {
      workspaceId: input.workspaceId,
      organizerId: input.organizerId,
      title,
      description: input.description ?? "",
      location: input.location ?? "",
      startAt: input.startAt,
      endAt: input.endAt,
      attendees: { create: attendeeIds.map((userId) => ({ userId })) },
    },
    select: { id: true, workspaceId: true, title: true },
  });

  if (attendeeIds.length > 0) {
    await notifyMeetingInvited(meeting, attendeeIds, input.organizerId);
  }
  return meeting;
}

// Cancelar deja cancelledAt en vez de borrar la fila: el mismo mecanismo de
// reconciliación que sincronizó la reunión al crearla la retira de cada
// Google Calendar (ver google-calendar-meeting-sync.ts) sin tener que
// fotografiar nada antes de un borrado en cascada.
export async function cancelMeeting(
  meetingId: string,
  userId: string,
): Promise<void> {
  await assertCanCancelMeeting(meetingId, userId);
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { cancelledAt: new Date() },
  });
}

export type AgendaMeeting = {
  id: string;
  title: string;
  location: string;
  startAt: Date;
  endAt: Date;
  organizer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  attendees: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }[];
  isOrganizer: boolean;
};

// Mis reuniones vigentes (organizo o asisto), de próximas a más lejanas.
// Para "Mi agenda". Excluye canceladas y ya terminadas.
export async function listMyMeetings(
  workspaceId: string,
  userId: string,
): Promise<AgendaMeeting[]> {
  await assertWorkspaceMember(workspaceId, userId);
  const rows = await prisma.meeting.findMany({
    where: {
      workspaceId,
      cancelledAt: null,
      endAt: { gte: new Date() },
      OR: [{ organizerId: userId }, { attendees: { some: { userId } } }],
    },
    select: {
      id: true,
      title: true,
      location: true,
      startAt: true,
      endAt: true,
      organizerId: true,
      organizer: { select: personSelect },
      attendees: { select: { user: { select: personSelect } } },
    },
    orderBy: { startAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    location: r.location,
    startAt: r.startAt,
    endAt: r.endAt,
    organizer: r.organizer,
    attendees: r.attendees.map((a) => a.user),
    isOrganizer: r.organizerId === userId,
  }));
}
