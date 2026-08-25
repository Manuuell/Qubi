"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureCurrentInRing } from "@/server/account-ring";

// Tras iniciar sesión no se va directo a "/": se pasa por aquí para dejar la
// cuenta en el conmutador. Ver el route handler para el porqué.
const REMEMBER_PATH = "/api/session/remember";
import { consumeToken } from "@/server/services/auth-token";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/server/services/auth-email";
import { checkRateLimit } from "@/server/lib/rate-limit";
import { getClientIp } from "@/server/lib/client-ip";

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

  // Por cuenta, no por IP: evita fuerza bruta contra un email concreto sin
  // depender de la IP del cliente (no siempre confiable tras un proxy).
  const rateLimit = checkRateLimit(`login:${email}`, {
    max: 10,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.ok) {
    return {
      error: "Demasiados intentos. Espera unos minutos antes de reintentar.",
    };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: REMEMBER_PATH });
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

  // Al contrario que en el login, aquí limitar por email no sirve de nada: un
  // script de altas masivas usa uno distinto cada vez, crea miles de cuentas y
  // de paso convierte nuestro SMTP en un cañón de correos de verificación. Por
  // eso se limita por IP, y si no hay proxy que la aporte (desarrollo) todas
  // las altas comparten un mismo cubo. Va después de validar el formato para
  // no gastarle el cupo a quien simplemente se equivoca al teclear.
  const ip = await getClientIp();
  const rateLimit = checkRateLimit(`register:${ip ?? "sin-ip"}`, {
    max: 10,
    windowMs: 60 * 60_000,
  });
  if (!rateLimit.ok) {
    return {
      error: "Se han creado demasiadas cuentas desde aquí. Prueba más tarde.",
    };
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

  const rateLimit = checkRateLimit(`resend-verify:${email}`, {
    max: 3,
    windowMs: 10 * 60_000,
  });
  if (rateLimit.ok) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      await sendVerificationEmail(email);
    }
  }
  // Respuesta genérica para no revelar si la cuenta existe (ni si se topó
  // con el límite de reenvíos).
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

  const rateLimit = checkRateLimit(`reset-request:${email}`, {
    max: 3,
    windowMs: 10 * 60_000,
  });
  if (rateLimit.ok) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Solo tiene sentido para cuentas con contraseña (las de Google no aplican).
    if (user?.hashedPassword) await sendPasswordResetEmail(email);
  }

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

export async function googleSignInAction(formData?: FormData) {
  // Al "agregar otra cuenta" hay que soltar la sesión actual ANTES de ir a
  // Google. Si sigue viva, Auth.js no cambia de cuenta: VINCULA la cuenta de
  // Google elegida al usuario que ya estaba dentro y devuelve esa misma sesión
  // (ver el branch "already signed in" de @auth/core handle-login). El
  // resultado parecía un login correcto pero seguías siendo el usuario
  // anterior, y de paso el Google del otro quedaba colgando de tu cuenta.
  //
  // Salir aquí es seguro: prepareAddAccountAction ya dejó la cuenta actual en
  // el anillo, así que se puede volver a ella sin escribir la contraseña. Se
  // usa signOut directo y no logoutAction porque ese redirige a /login y
  // cortaría el viaje a Google a medias.
  if (formData?.get("add") === "1") {
    await signOut({ redirect: false });
  }
  await signIn("google", { redirectTo: REMEMBER_PATH });
}

export async function logoutAction() {
  // Cerrar sesión NO olvida la cuenta: se queda en el conmutador para poder
  // volver a ella sin escribir la contraseña. Se quita solo con la ✕ del menú
  // (removeAccountAction), que es la acción explícita de "no me recuerdes
  // aquí". De paso se registra por si se entró antes de que esto existiera.
  await ensureCurrentInRing();
  await signOut({ redirectTo: "/login" });
}
