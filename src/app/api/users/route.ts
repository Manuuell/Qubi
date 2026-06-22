import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Resuelve info de usuarios por id, para mostrar autores en los comentarios.
export async function GET(request: Request) {
  await getCurrentUser();

  const ids =
    new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ??
    [];

  if (ids.length === 0) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json(
    users.map((u) => {
      const username = u.name || u.email;
      return {
        id: u.id,
        username,
        avatarUrl:
          u.image ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(username)}`,
      };
    }),
  );
}
