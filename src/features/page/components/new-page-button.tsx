"use client";

import { useState, useTransition } from "react";
import { FileText, NotebookPen, Plus, Rocket } from "lucide-react";
import { createPageAction } from "@/server/actions/page";

const dateLabel = () =>
  new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(
    new Date(),
  );

const TEMPLATES = [
  {
    icon: FileText,
    label: "Nota en blanco",
    hint: "Un documento libre para escribir lo que necesites.",
    title: () => "",
  },
  {
    icon: NotebookPen,
    label: "Notas de reunión",
    hint: "Para dejar constancia de acuerdos y pendientes de una reunión.",
    title: () => `Notas de reunión — ${dateLabel()}`,
  },
  {
    icon: Rocket,
    label: "Brief de proyecto",
    hint: "Resume objetivo, alcance y entregables antes de arrancar.",
    title: () => "Brief de proyecto",
  },
];

// Página = documento libre tipo Notion (notas, actas, briefs…), a diferencia
// de una base de datos (tabla de registros) o un proyecto (tareas). Ofrece
// un par de plantillas de arranque para que su propósito quede claro.
export function NewPageButton({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function create(title: string) {
    setOpen(false);
    startTransition(() => createPageAction({ workspaceId, title }));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm disabled:opacity-50"
      >
        <Plus className="size-4" />
        Nueva página
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-30 mt-1 w-72 rounded-2xl p-1.5 duration-150">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => create(t.title())}
                className="hover:bg-accent transition-ios flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left"
              >
                <t.icon className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="text-muted-foreground block text-xs">
                    {t.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
