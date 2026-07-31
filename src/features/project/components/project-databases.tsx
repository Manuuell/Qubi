"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Database, Plus, Share2, Unlink } from "lucide-react";
import {
  createProjectDatabaseAction,
  linkExistingDatabaseAction,
  unlinkDatabaseAction,
} from "@/server/actions/project-database";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type DatabaseItem = {
  id: string;
  title: string;
  icon: string | null;
  sharedWithProjects: { id: string; name: string }[];
};
type LinkableDatabase = { id: string; title: string; icon: string | null };

// Bases de datos de archivos/información del proyecto: reutiliza el motor
// de páginas tipo Notion. Una misma base puede compartirse entre 2+
// proyectos (útil para info transversal, como specs o assets comunes).
export function ProjectDatabases({
  workspaceId,
  projectId,
  databases,
  linkable,
}: {
  workspaceId: string;
  projectId: string;
  databases: DatabaseItem[];
  linkable: LinkableDatabase[];
}) {
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [linking, setLinking] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger className="glass hover:bg-accent transition-ios flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium">
            <Plus className="size-4" />
            Nueva base de datos
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva base de datos del proyecto</DialogTitle>
              <DialogDescription>
                Para guardar información, carpetas o archivos de referencia. Las
                tareas pueden vincularse a ella.
              </DialogDescription>
            </DialogHeader>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Assets del proyecto"
              className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
            />
            <button
              onClick={() =>
                startTransition(() =>
                  createProjectDatabaseAction({
                    workspaceId,
                    projectId,
                    name,
                  }),
                )
              }
              disabled={pending || !name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios self-end rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
            >
              Crear
            </button>
          </DialogContent>
        </Dialog>

        {linkable.length > 0 && (
          <Dialog open={linking} onOpenChange={setLinking}>
            <DialogTrigger className="text-muted-foreground hover:bg-accent transition-ios flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm">
              <Share2 className="size-4" />
              Vincular existente
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular base de datos existente</DialogTitle>
                <DialogDescription>
                  Comparte una base de datos de otro proyecto con este.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {linkable.map((d) => (
                  <button
                    key={d.id}
                    onClick={() =>
                      startTransition(async () => {
                        await linkExistingDatabaseAction({
                          workspaceId,
                          projectId,
                          pageId: d.id,
                        });
                        setLinking(false);
                      })
                    }
                    disabled={pending}
                    className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm disabled:opacity-50"
                  >
                    <Database className="text-muted-foreground size-4 shrink-0" />
                    {d.icon ? `${d.icon} ` : ""}
                    {d.title || "Base de datos"}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {databases.length === 0 ? (
        <Card variant="glass" className="py-10 text-center">
          <p className="text-muted-foreground text-sm">
            Sin bases de datos todavía. Crea una para guardar información,
            documentos o carpetas de este proyecto.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {databases.map((d) => (
            <Card
              key={d.id}
              variant="glass"
              className="flex-row items-center gap-2.5 p-4"
            >
              <Link
                href={`/w/${workspaceId}/${d.id}`}
                className="flex min-w-0 flex-1 items-center gap-2.5"
              >
                <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
                  <Database className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {d.icon ? `${d.icon} ` : ""}
                    {d.title}
                  </span>
                  {d.sharedWithProjects.length > 0 && (
                    <span className="text-muted-foreground block truncate text-xs">
                      Compartida con{" "}
                      {d.sharedWithProjects.map((p) => p.name).join(", ")}
                    </span>
                  )}
                </span>
              </Link>
              <button
                onClick={() =>
                  startTransition(() =>
                    unlinkDatabaseAction({
                      workspaceId,
                      projectId,
                      pageId: d.id,
                    }),
                  )
                }
                aria-label="Desvincular del proyecto"
                title="Desvincular del proyecto"
                className="text-muted-foreground hover:text-destructive transition-ios shrink-0"
              >
                <Unlink className="size-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
