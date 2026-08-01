import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listMessagesSince } from "@/server/services/chat";

// Polling ligero: el cliente pide "¿hay mensajes nuevos desde X?" cada
// pocos segundos mientras el chat está abierto. No hay servidor de
// WebSockets para chat (a diferencia de la colaboración de páginas).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  const after = new URL(request.url).searchParams.get("after");
  const messages = await listMessagesSince(
    conversationId,
    user.id,
    after ? new Date(after) : new Date(0),
  );
  return NextResponse.json(messages);
}
