"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type RealtimeChatEvent = { type: "chat"; conversationId: string };
type RealtimeEvent = RealtimeChatEvent | { type: "notification" };

// Nombre del CustomEvent que se dispara en window para cada mensaje de chat
// nuevo. ChatThread lo escucha para refrescar al instante en vez de esperar
// al siguiente poll.
export const CHAT_EVENT = "qubi:chat";

// Una única conexión SSE por pestaña (montada una vez en el layout del
// workspace). Notificaciones -> refresca la bandeja (router.refresh() vuelve
// a ejecutar los server components, incluida getInbox). Chat -> además de
// refrescar el contador de no leídos del sidebar, avisa a quien tenga el
// hilo abierto mediante un CustomEvent en window.
export function RealtimeProvider() {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onmessage = (e) => {
      if (!e.data) return;
      let event: RealtimeEvent;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }

      if (event.type === "chat") {
        window.dispatchEvent(
          new CustomEvent<RealtimeChatEvent>(CHAT_EVENT, { detail: event }),
        );
      }
      router.refresh();
    };

    return () => source.close();
  }, [router]);

  return null;
}
