import { prisma } from "@/lib/db";
import {
  getAccessToken,
  callGoogle,
  EVENTS_ENDPOINT,
} from "@/server/services/google-calendar";

// Replica las reuniones como eventos CON HORA en el Google Calendar personal
// de cada invitado que haya conectado su cuenta. Mismo mecanismo de
// reconciliación que google-calendar-sync.ts (tareas): se mira cómo está la
// reunión ahora y se deja el calendario igual, cree, actualice o borre lo
// que haga falta.

// Una reunión aparece en el calendario mientras no esté cancelada. A
// diferencia de las tareas, no hay "hecha": una reunión que ya pasó se queda
// en el calendario como historial, igual que cualquier evento pasado.
function shouldAppear(meeting: { cancelledAt: Date | null }): boolean {
  return meeting.cancelledAt === null;
}

type SyncMeeting = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
  cancelledAt: Date | null;
  attendees: { userId: string }[];
  googleEvents: { userId: string; eventId: string }[];
};

// startAt/endAt son instantes absolutos; toISOString() ya trae el offset
// correcto, así que timeZone es solo para que Google lo muestre bien. Se usa
// la misma zona fija que el resto del proceso (TZ=America/Bogota en
// docker-compose.prod.yml) — no hay zona horaria por usuario.
function eventBody(meeting: SyncMeeting, baseUrl: string) {
  const link = `${baseUrl}/w/${meeting.workspaceId}/agenda`;
  return {
    summary: meeting.title,
    description: [meeting.description, link].filter(Boolean).join("\n\n"),
    location: meeting.location || undefined,
    start: {
      dateTime: meeting.startAt.toISOString(),
      timeZone: "America/Bogota",
    },
    end: { dateTime: meeting.endAt.toISOString(), timeZone: "America/Bogota" },
    source: { title: "Qubi", url: link },
  };
}

// Quita un evento del calendario de alguien y olvida la referencia.
async function removeEvent(
  meetingId: string,
  userId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getAccessToken(userId);
  if (accessToken) {
    await callGoogle(accessToken, `${EVENTS_ENDPOINT}/${eventId}`, "DELETE");
  }
  await prisma.meetingCalendarEvent.deleteMany({
    where: { meetingId, userId },
  });
}

async function upsertEvent(
  meeting: SyncMeeting,
  userId: string,
  existingEventId: string | undefined,
  baseUrl: string,
): Promise<void> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return; // no conectado, o revocó el permiso

  const body = eventBody(meeting, baseUrl);

  if (existingEventId) {
    const result = await callGoogle(
      accessToken,
      `${EVENTS_ENDPOINT}/${existingEventId}`,
      "PATCH",
      body,
    );
    if (result.ok) return;
    // 404/410 = alguien borró el evento a mano en Google: se recrea abajo.
    if (result.status !== 404 && result.status !== 410) return;
    await prisma.meetingCalendarEvent.deleteMany({
      where: { meetingId: meeting.id, userId },
    });
  }

  const created = await callGoogle(accessToken, EVENTS_ENDPOINT, "POST", body);
  if (!created.ok || !created.id) return;

  await prisma.meetingCalendarEvent.upsert({
    where: { meetingId_userId: { meetingId: meeting.id, userId } },
    create: { meetingId: meeting.id, userId, eventId: created.id },
    update: { eventId: created.id },
  });
}

// Deja el calendario de cada invitado como debe estar según la reunión.
export async function syncMeetingToGoogleCalendars(
  meetingId: string,
  baseUrl: string,
): Promise<void> {
  const meeting = (await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      description: true,
      location: true,
      startAt: true,
      endAt: true,
      cancelledAt: true,
      attendees: { select: { userId: true } },
      googleEvents: { select: { userId: true, eventId: true } },
    },
  })) as SyncMeeting | null;

  if (!meeting) return; // se borró entre la acción y esta pasada

  const visible = shouldAppear(meeting);
  const attendeeIds = new Set(meeting.attendees.map((a) => a.userId));

  // 1) Fuera lo que ya no toca: reunión cancelada, o gente que ya no está invitada.
  for (const event of meeting.googleEvents) {
    if (!visible || !attendeeIds.has(event.userId)) {
      await removeEvent(meeting.id, event.userId, event.eventId);
    }
  }
  if (!visible) return;

  // 2) Crear o actualizar para cada invitado.
  const byUser = new Map(
    meeting.googleEvents.map((e) => [e.userId, e.eventId]),
  );
  for (const userId of attendeeIds) {
    await upsertEvent(meeting, userId, byUser.get(userId), baseUrl);
  }
}
