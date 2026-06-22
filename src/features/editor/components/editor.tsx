"use client";

import dynamic from "next/dynamic";

// El editor toca el DOM (ProseMirror), así que se carga solo en cliente.
export const Editor = dynamic(() => import("./blocknote-editor"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground text-sm">Cargando editor…</div>
  ),
});
