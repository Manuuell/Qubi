"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Plus, Paperclip, X, Tag } from "lucide-react";
import { IssueType, Priority } from "@/generated/prisma/enums";
import {
  createTaskAction,
  addTaskAttachmentAction,
} from "@/server/actions/task";
import { createLabelAction } from "@/server/actions/label";
import { MAX_ASSIGNEES } from "@/server/services/task";
import {
  TYPE_LABEL,
  TYPE_ORDER,
  TYPE_ICON,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  initials,
} from "@/features/task/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LabelOption = { id: string; name: string; color: string };
export type MemberOption = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

// Modal de creación de tarea: tipo, etiquetas, prioridad, hasta 3 responsables,
// fechas, descripción y adjuntos — reemplaza la barra de texto simple.
export function NewTaskDialog({
  workspaceId,
  projectId,
  members,
  labels: initialLabels,
}: {
  workspaceId: string;
  projectId: string;
  members: MemberOption[];
  labels: LabelOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<IssueType>(IssueType.TASK);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [labels, setLabels] = useState(initialLabels);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setBody("");
    setType(IssueType.TASK);
    setPriority(Priority.MEDIUM);
    setAssigneeIds([]);
    setLabelIds([]);
    setNewLabelName("");
    setStartDate("");
    setDueDate("");
    setFiles([]);
    setError(null);
  }

  function toggleAssignee(id: string) {
    setAssigneeIds((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= MAX_ASSIGNEES
          ? cur
          : [...cur, id],
    );
  }

  function toggleLabel(id: string) {
    setLabelIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  async function createNewLabel() {
    const name = newLabelName.trim();
    if (!name) return;
    setNewLabelName("");
    const label = await createLabelAction({ workspaceId, name });
    setLabels((cur) =>
      [...cur, label].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setLabelIds((cur) => [...cur, label.id]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      try {
        const issue = await createTaskAction({
          workspaceId,
          projectId,
          title: value,
          body,
          type,
          priority,
          assigneeIds,
          labelIds,
          startDate: startDate || null,
          dueDate: dueDate || null,
        });
        if (issue) {
          for (const file of files) {
            const fd = new FormData();
            fd.set("taskId", issue.id);
            fd.set("workspaceId", workspaceId);
            fd.set("projectId", projectId);
            fd.set("file", file);
            await addTaskAttachmentAction(fd);
          }
        }
        reset();
        setOpen(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo crear la tarea.",
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger className="glass hover:bg-accent transition-ios flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
        <Plus className="size-4" />
        Agregar tarea
      </DialogTrigger>
      <DialogContent className="max-w-lg" showClose={!pending}>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>
            Define el tipo, quién la hace y con qué prioridad.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea"
            disabled={pending}
            className="bg-background focus:ring-ring transition-ios w-full rounded-2xl border px-4 py-2.5 text-sm font-medium outline-none focus:ring-2"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                Tipo
              </p>
              <Select
                value={type}
                onValueChange={(v) => v && setType(v as IssueType)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue>
                    {(v: IssueType) => `${TYPE_ICON[v]} ${TYPE_LABEL[v]}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_ICON[t]} {TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                Prioridad
              </p>
              <Select
                value={priority}
                onValueChange={(v) => v && setPriority(v as Priority)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue>
                    {(v: Priority) => PRIORITY_LABEL[v]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              Responsables (máx. {MAX_ASSIGNEES})
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const active = assigneeIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleAssignee(m.id)}
                    disabled={!active && assigneeIds.length >= MAX_ASSIGNEES}
                    className={cn(
                      "transition-ios flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs disabled:opacity-40",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent",
                    )}
                  >
                    <Avatar size="sm">
                      <AvatarImage src={m.image ?? undefined} alt="" />
                      <AvatarFallback>
                        {initials(m.name, m.email)}
                      </AvatarFallback>
                    </Avatar>
                    {m.name?.trim() || m.email}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium">
              Etiquetas
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {labels.map((l) => {
                const active = labelIds.includes(l.id);
                return (
                  <button
                    type="button"
                    key={l.id}
                    onClick={() => toggleLabel(l.id)}
                    className="transition-ios rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      background: active ? l.color : `${l.color}20`,
                      color: active ? "#fff" : l.color,
                    }}
                  >
                    {l.name}
                  </button>
                );
              })}
              <span className="flex items-center gap-1">
                <Tag className="text-muted-foreground size-3" />
                <input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createNewLabel();
                    }
                  }}
                  placeholder="Nueva etiqueta…"
                  className="placeholder:text-muted-foreground w-24 bg-transparent text-xs outline-none"
                />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                Fecha de inicio
              </p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background w-full rounded-xl border px-3 py-1.5 text-sm outline-none"
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-medium">
                Fecha límite
              </p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-background w-full rounded-xl border px-3 py-1.5 text-sm outline-none"
              />
            </div>
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Descripción, formularios o notas (opcional)…"
            className="bg-background focus:ring-ring transition-ios w-full resize-none rounded-2xl border p-3 text-sm outline-none focus:ring-2"
          />

          <div>
            <label className="text-muted-foreground hover:text-foreground transition-ios flex cursor-pointer items-center gap-1.5 text-xs">
              <Paperclip className="size-3.5" />
              Adjuntar archivos o carpeta con información
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) =>
                  setFiles((cur) => [
                    ...cur,
                    ...Array.from(e.target.files ?? []),
                  ])
                }
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="text-muted-foreground flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((cur) => cur.filter((_, idx) => idx !== i))
                      }
                      className="hover:text-destructive shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-xs">
              {error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !title.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
            >
              {pending ? "Creando…" : "Crear tarea"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
