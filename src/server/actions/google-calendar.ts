"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as googleCalendar from "@/server/services/google-calendar";

// Retira el permiso: revoca el token en Google y borra la conexión.
export async function disconnectGoogleCalendarAction() {
  const user = await getCurrentUser();
  await googleCalendar.disconnect(user.id);
  revalidatePath("/account");
}
