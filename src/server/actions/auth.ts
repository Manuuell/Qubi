"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { removeFromRing } from "@/server/account-ring";
import { consumeToken } from "@/server/services/auth-token";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/server/services/auth-email";

export type FormState = {
  error?: string;
  info?: string;
  needsVerification?: boolean;
  email?: string;
};

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
      // Si las credenciales son correctas pero falta verificar el correo,
      // damos un mensaje específico y la opción de reenviar el enlace.
      const user = await prisma.user.findUnique({ where: { email } });
      if (
        user?.hashedPassword &&
        !user.emailVerified &&
        (await bcrypt.compare(password, user.hashedPassword))
      ) {
        return { needsVerification: true, email };
      }
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

  // No se inicia sesión: primero hay que confirmar el correo.
  await sendVerificationEmail(email);
  return {
    info: "Cuenta creada. Te enviamos un correo para confirmar tu dirección; ábrelo antes de entrar.",
  };
}

export async function resendVerificationAction(input: {
  email: string;
}): Promise<FormState> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    await sendVerificationEmail(email);
  }
  // Respuesta genérica para no revelar si la cuenta existe.
  return {
    info: "Si la cuenta existe y aún no está verificada, te enviamos un nuevo correo.",
  };
}

export async function verifyEmailAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const email = await consumeToken("verify", token);
  if (!email) redirect("/login?verify=invalid");
  await prisma.user.updateMany({
    where: { email },
    data: { emailVerified: new Date() },
  });
  redirect("/login?verify=ok");
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  // Solo tiene sentido para cuentas con contraseña (las de Google no aplican).
  if (user?.hashedPassword) await sendPasswordResetEmail(email);

  return {
    info: "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.",
  };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const email = await consumeToken("reset", token);
  if (!email) {
    return {
      error: "El enlace no es válido o ha caducado. Solicita uno nuevo.",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  // Restablecer prueba la posesión del correo: queda verificado de paso.
  await prisma.user.updateMany({
    where: { email },
    data: { hashedPassword, emailVerified: new Date() },
  });

  redirect("/login?reset=ok");
}

export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");

  if (next.length < 6) {
    return { error: "La nueva contraseña debe tener al menos 6 caracteres." };
  }

  // Si ya tiene contraseña, exige la actual. Si no (p. ej. cuenta de Google),
  // permite establecer una nueva directamente.
  if (user.hashedPassword) {
    const ok = await bcrypt.compare(current, user.hashedPassword);
    if (!ok) return { error: "La contraseña actual no es correcta." };
  }

  const hashedPassword = await bcrypt.hash(next, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { hashedPassword },
  });

  return { info: "Contraseña actualizada correctamente." };
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
