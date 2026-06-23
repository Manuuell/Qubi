"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { qubiSchema } from "../schema";

const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://localhost:1234";

// Editor de solo lectura para páginas públicas: se conecta al documento Yjs
// y muestra el contenido sin permitir edición (editable={false}).
export default function ReadonlyBlockEditor({ pageId }: { pageId: string }) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const p = new HocuspocusProvider({ url: COLLAB_URL, name: pageId });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProvider(p);
    return () => p.destroy();
  }, [pageId]);

  const editor = useCreateBlockNote(
    provider
      ? {
          schema: qubiSchema,
          collaboration: {
            fragment: provider.document.getXmlFragment("document"),
            user: { name: "Invitado", color: "#9ca3af" },
            provider: { awareness: provider.awareness ?? undefined },
          },
        }
      : { schema: qubiSchema },
    [provider],
  );

  if (!provider) {
    return <div className="text-muted-foreground text-sm">Cargando…</div>;
  }

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      editable={false}
    />
  );
}
