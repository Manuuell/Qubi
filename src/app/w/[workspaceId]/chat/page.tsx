import { MessageCircle } from "lucide-react";

export default function ChatIndexPage() {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
      <MessageCircle className="animate-chat-float size-8" />
      Selecciona una conversación, o escríbele a alguien desde su perfil.
    </div>
  );
}
