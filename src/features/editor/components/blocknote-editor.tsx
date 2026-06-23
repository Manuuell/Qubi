"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
  YjsThreadStore,
  type User,
} from "@blocknote/core/comments";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { qubiSchema } from "../schema";

const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://localhost:1234";

// Color estable por usuario (para su cursor) a partir del nombre.
const CURSOR_COLORS = [
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
];
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// Sube imágenes/archivos a MinIO y devuelve su URL pública.
async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) throw new Error("Error al subir el archivo");
  const data = (await res.json()) as { url: string };
  return data.url;
}

// Resuelve la info de los autores de los comentarios.
async function resolveUsers(userIds: string[]): Promise<User[]> {
  const res = await fetch(`/api/users?ids=${userIds.join(",")}`);
  if (!res.ok) return [];
  return (await res.json()) as User[];
}

export default function BlockNoteEditor({
  pageId,
  userId,
  userName,
  members,
}: {
  pageId: string;
  userId: string;
  userName: string;
  members: { id: string; name: string }[];
}) {
  // El proveedor se crea en un efecto (seguro ante el doble montaje de
  // React StrictMode en dev): si se destruye, el efecto crea uno nuevo.
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const p = new HocuspocusProvider({ url: COLLAB_URL, name: pageId });
    // El proveedor es una conexión con ciclo de vida; crearlo aquí es correcto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProvider(p);
    return () => p.destroy();
  }, [pageId]);

  // El editor se recrea cuando cambia el proveedor (deps: [provider]).
  const editor = useCreateBlockNote(
    provider
      ? {
          schema: qubiSchema,
          collaboration: {
            fragment: provider.document.getXmlFragment("document"),
            user: { name: userName, color: colorFor(userName) },
            provider: { awareness: provider.awareness ?? undefined },
          },
          uploadFile,
          // Comentarios colaborativos: se guardan en el propio doc Yjs.
          extensions: [
            CommentsExtension({
              threadStore: new YjsThreadStore(
                userId,
                provider.document.getMap("threads"),
                new DefaultThreadStoreAuth(userId, "editor"),
              ),
              resolveUsers,
            }),
          ],
        }
      : { schema: qubiSchema, uploadFile },
    [provider],
  );

  if (!provider) {
    return <div className="text-muted-foreground text-sm">Conectando…</div>;
  }

  return (
    <BlockNoteView
      editor={editor}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    >
      {/* Menú de menciones: escribe "@" para mencionar a un miembro. */}
      <SuggestionMenuController
        triggerCharacter="@"
        getItems={async (query) =>
          members
            .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
            .map((m) => ({
              title: m.name,
              onItemClick: () => {
                editor.insertInlineContent([
                  { type: "mention", props: { userId: m.id, name: m.name } },
                  " ",
                ]);
              },
            }))
        }
      />
    </BlockNoteView>
  );
}
