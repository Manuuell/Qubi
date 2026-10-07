import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Variante para pantallas públicas: conserva la sesión si existe, pero no
// fuerza a iniciar sesión ni convierte una simple visita en una redirección.
export async function getOptionalUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  return prisma.user.findUnique({ where: { id: userId } });
}

// Devuelve el usuario autenticado. Si no hay sesión, redirige a /login.
// Usar en server components, server actions y route handlers protegidos.
export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return user;
}
