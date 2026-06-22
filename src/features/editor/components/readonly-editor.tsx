"use client";

import dynamic from "next/dynamic";

// El editor toca el DOM (ProseMirror), así que se carga solo en cliente.
export const ReadonlyEditor = dynamic(() => import("./readonly-block-editor"), {
  ssr: false,
  loading: () => <div className="text-muted-foreground text-sm">Cargando…</div>,
});
