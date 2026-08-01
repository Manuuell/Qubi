import { getCurrentUser } from "@/lib/auth";
import { subscribeToUser } from "@/server/lib/event-bus";

// Stream SSE del usuario: un evento por cada mensaje de chat nuevo dirigido
// a él o notificación creada. El cliente (RealtimeProvider) mantiene una
// única conexión abierta por pestaña y reacciona refrescando lo que
// corresponda, en vez de tener que hacer polling cada pocos segundos.
export async function GET(request: Request) {
  const user = await getCurrentUser();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Comentario de apertura: algunos proxies necesitan bytes iniciales
      // para no cortar la conexión antes del primer evento real.
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribeToUser(user.id, send);

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
