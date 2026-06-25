"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { removeFromRing } from "@/server/account-ring";

type FormState = { error?: string };

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw error; // re-lanza el redirect de éxito
  }
  return {};
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email.includes("@")) return { error: "Introduce un email válido." };
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese email." };

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name: name || null, hashedPassword },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada, pero no se pudo iniciar sesión." };
    }
    throw error;
  }
  return {};
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function logoutAction() {
  // Al cerrar sesión, esa cuenta deja de estar disponible en el conmutador.
  const session = await auth();
  if (session?.user?.id) await removeFromRing(session.user.id);
  await signOut({ redirectTo: "/login" });
}
