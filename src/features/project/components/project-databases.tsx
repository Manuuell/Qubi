"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Database,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Unlink,
} from "lucide-react";
import {
  createProjectDatabaseAction,
  linkExistingDatabaseAction,
  unlinkDatabaseAction,
  renameProjectDatabaseAction,
  deleteProjectDatabaseAction,
} from "@/server/actions/project-database";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const DATABASE_ICONS = [
  "📁",
  "🗂️",
  "📋",
  "📊",
  "📎",
  "🧾",
  "🖼️",
  "🗄️",
  "📦",
  "🔖",
];

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
  const [icon, setIcon] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [renaming, setRenaming] = useState<DatabaseItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<DatabaseItem | null>(null);

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
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs">
                Icono (opcional)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DATABASE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() =>
                      setIcon((cur) => (cur === emoji ? null : emoji))
                    }
                    aria-label={`Icono ${emoji}`}
                    className={`transition-ios grid size-9 place-items-center rounded-xl text-base active:scale-95 ${
                      icon === emoji
                        ? "bg-primary/15 ring-primary ring-2"
                        : "bg-background/60 hover:bg-accent"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() =>
                startTransition(() =>
                  createProjectDatabaseAction({
                    workspaceId,
                    projectId,
                    name,
                    icon: icon ?? undefined,
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
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Más opciones"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios grid size-8 shrink-0 place-items-center rounded-full"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenaming(d);
                      setRenameValue(d.title);
                    }}
                  >
                    <Pencil className="size-4" />
                    Renombrar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      startTransition(() =>
                        unlinkDatabaseAction({
                          workspaceId,
                          projectId,
                          pageId: d.id,
                        }),
                      )
                    }
                  >
                    <Unlink className="size-4" />
                    Desvincular del proyecto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setDeleting(d)}
                  >
                    <Trash2 className="size-4" />
                    Borrar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar base de datos</DialogTitle>
          </DialogHeader>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
          />
          <button
            onClick={() => {
              if (!renaming) return;
              startTransition(() =>
                renameProjectDatabaseAction({
                  workspaceId,
                  projectId,
                  pageId: renaming.id,
                  title: renameValue,
                }),
              );
              setRenaming(null);
            }}
            disabled={pending || !renameValue.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios self-end rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
          >
            Guardar
          </button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`¿Borrar "${deleting?.title}"?`}
        description="Se moverá a la papelera. Podrás recuperarla desde ahí mientras no se vacíe."
        confirmLabel="Borrar"
        pending={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(() =>
            deleteProjectDatabaseAction({
              workspaceId,
              projectId,
              pageId: deleting.id,
            }),
          );
          setDeleting(null);
        }}
      />
    </div>
  );
}
