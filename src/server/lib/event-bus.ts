import { EventEmitter } from "node:events";

// Pub/sub en memoria, por proceso. Alimenta los streams SSE de /api/events:
// cuando llega un mensaje de chat o se crea una notificación, se publica en
// el canal del usuario destinatario y su pestaña abierta se entera al
// instante sin tener que esperar al siguiente poll.
//
// Limitación conocida: solo funciona dentro de un mismo proceso Node. Si en
// el futuro se despliega con varias instancias detrás de un balanceador,
// esto necesita moverse a un backend compartido (Redis pub/sub).
const bus = new EventEmitter();
bus.setMaxListeners(0); // muchas pestañas conectadas a la vez es normal

export type RealtimeEvent =
  | { type: "chat"; conversationId: string }
  | { type: "notification" };

function channel(userId: string) {
  return `user:${userId}`;
}

export function publishToUser(userId: string, event: RealtimeEvent) {
  bus.emit(channel(userId), event);
}

export function subscribeToUser(
  userId: string,
  onEvent: (event: RealtimeEvent) => void,
) {
  const ch = channel(userId);
  bus.on(ch, onEvent);
  return () => bus.off(ch, onEvent);
}
