"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBaseUrl } from "@/lib/mail";
import * as meetingService from "@/server/services/meeting";
import { syncMeetingToGoogleCalendars } from "@/server/services/google-calendar-meeting-sync";

function revalidateAgenda(workspaceId: string) {
  revalidatePath(`/w/${workspaceId}/agenda`);
}

// Replica el cambio en el Google Calendar de cada invitado conectado. Va en
// after() a propósito: se ejecuta tras responder, así que agendar/cancelar
// una reunión no espera a Google, y si Google falla la reunión ya se guardó
// igual. La URL base se lee ANTES, porque dentro del callback ya no hay
// petición.
async function syncMeetingCalendar(meetingId: string) {
  const baseUrl = await getBaseUrl();
  after(async () => {
    try {
      await syncMeetingToGoogleCalendars(meetingId, baseUrl);
    } catch (error) {
      console.error(
        "[google-calendar] no se pudo sincronizar la reunión",
        meetingId,
        error,
      );
    }
  });
}

export async function createMeetingAction(input: {
  workspaceId: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string; // "YYYY-MM-DDTHH:mm", hora local del servidor (America/Bogota)
  endAt: string;
  attendeeIds: string[];
}) {
  if (!input.title.trim()) return;
  const user = await getCurrentUser();
  const meeting = await meetingService.createMeeting({
    workspaceId: input.workspaceId,
    organizerId: user.id,
    title: input.title,
    description: input.description,
    location: input.location,
    startAt: new Date(`${input.startAt}:00`),
    endAt: new Date(`${input.endAt}:00`),
    attendeeIds: input.attendeeIds,
  });
  revalidateAgenda(input.workspaceId);
  await syncMeetingCalendar(meeting.id);
  return meeting;
}

export async function cancelMeetingAction(input: {
  meetingId: string;
  workspaceId: string;
}) {
  const user = await getCurrentUser();
  await meetingService.cancelMeeting(input.meetingId, user.id);
  revalidateAgenda(input.workspaceId);
  await syncMeetingCalendar(input.meetingId);
}
