"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { verifySwitchToken } from "@/lib/switch-token";
import { addToRing, readRing, removeFromRing } from "@/server/account-ring";

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
