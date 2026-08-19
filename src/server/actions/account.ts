"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { verifySwitchToken } from "@/lib/switch-token";
import { addToRing, readRing, removeFromRing } from "@/server/account-ring";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";
import { getBaseUrl } from "@/lib/mail";
import {
  calendarFeedUrl,
  getOrCreateCalendarToken,
  regenerateCalendarToken,
} from "@/server/services/calendar";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
// Nota: "image/*" incluye image/svg+xml, que puede llevar <script> incrustado.
// uploadFile() lo rechaza igual (ver BLOCKED_MIME_TYPES en @/lib/storage) aunque
// pase este chequeo de "es una imagen".

type NameFormState = { error?: string; info?: string };

// Actualiza el nombre visible del usuario actual.
export async function updateProfileNameAction(
  _prevState: NameFormState,
  formData: FormData,
): Promise<NameFormState> {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "El nombre no puede estar vacío." };
  }
  if (name.length > 80) {
    return { error: "El nombre es demasiado largo." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/account", "layout");
  revalidatePath("/", "layout");
  return { info: "Nombre actualizado." };
}

// Sube y guarda la foto de perfil del usuario actual.
export async function updateProfileImageAction(formData: FormData) {
  const user = await getCurrentUser();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    throw new Error("Selecciona una imagen válida.");
  }

  const url = await uploadFile(file, MAX_AVATAR_BYTES);
  await prisma.user.update({ where: { id: user.id }, data: { image: url } });
  revalidatePath("/account", "layout");
  return { url };
}

// Guarda la cuenta activa en el anillo para poder volver a ella sin contraseña.
async function ensureCurrentInRing() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return;
  const user = await prisma.user.findUnique({ where: { id } });
  if (user) {
    await addToRing({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });
  }
}

// "Agregar otra cuenta": guarda la actual y va al login para entrar con otra.
export async function prepareAddAccountAction() {
  await ensureCurrentInRing();
  redirect("/login?add=1");
}

// Cambia a una cuenta ya recordada en este navegador, sin pedir contraseña.
export async function switchToAccountAction(input: { userId: string }) {
  const ring = await readRing();
  const entry = ring.find((e) => e.userId === input.userId);
  if (!entry || !verifySwitchToken(entry.token)) {
    if (entry) await removeFromRing(input.userId);
    redirect("/login");
  }

  // Conserva la cuenta actual en el anillo antes de cambiar.
  await ensureCurrentInRing();
  await signIn("switch", { token: entry.token, redirectTo: "/" });
}

// Quita una cuenta del conmutador de este navegador.
export async function removeAccountAction(input: { userId: string }) {
  await removeFromRing(input.userId);
  revalidatePath("/", "layout");
}

// URL del feed ICS personal para sincronizar la agenda con Google Calendar.
// Crea el token la primera vez (nadie más conoce esta URL).
export async function getCalendarFeedUrlAction(): Promise<{ url: string }> {
  const user = await getCurrentUser();
  const token = await getOrCreateCalendarToken(user.id);
  return { url: calendarFeedUrl(await getBaseUrl(), token) };
}

// Genera un token nuevo: revoca la URL anterior (por si se filtró).
export async function regenerateCalendarTokenAction(): Promise<{
  url: string;
}> {
  const user = await getCurrentUser();
  const token = await regenerateCalendarToken(user.id);
  return { url: calendarFeedUrl(await getBaseUrl(), token) };
}
