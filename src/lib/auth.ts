import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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
