"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as inviteService from "@/server/services/invite";
import * as notificationService from "@/server/services/notification";

export async function acceptInviteAction(input: { inviteId: string }) {
  const user = await getCurrentUser();
  await inviteService.acceptInvite(input.inviteId, {
    id: user.id,
    email: user.email,
  });
  // El sidebar (lista de espacios y bandeja) se renderiza en el layout.
  revalidatePath("/", "layout");
}

export async function declineInviteAction(input: { inviteId: string }) {
  const user = await getCurrentUser();
  await inviteService.declineInvite(input.inviteId, { email: user.email });
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(input: { id: string }) {
  const user = await getCurrentUser();
  await notificationService.markNotificationRead(user.id, input.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  await notificationService.markAllNotificationsRead(user.id);
  revalidatePath("/", "layout");
}
