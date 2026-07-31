"use client";

import { useState, useTransition } from "react";
import { Camera, PartyPopper } from "lucide-react";
import { IssueStatus } from "@/generated/prisma/enums";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from "@/features/task/labels";
import {
  addTaskProgressAction,
  setTaskStatusAction,
} from "@/server/actions/task";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function TaskStatusSelect({
  taskId,
  workspaceId,
  projectId,
  status,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  status: IssueStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [askingEvidence, setAskingEvidence] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyStatus(next: IssueStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await setTaskStatusAction({
          taskId,
          workspaceId,
          projectId,
          status: next,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo actualizar.");
        if (next === IssueStatus.DONE) setAskingEvidence(true);
      }
    });
  }

  function onValueChange(value: string | null) {
    if (!value) return;
    const next = value as IssueStatus;
    if (next === IssueStatus.DONE && status !== IssueStatus.DONE) {
      setAskingEvidence(true);
      return;
    }
    applyStatus(next);
  }

  return (
    <>
      <Select value={status} disabled={pending} onValueChange={onValueChange}>
        <SelectTrigger aria-label="Estado de la tarea" className="text-xs">
          <span
            className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[status])}
          />
          <SelectValue>{(v: IssueStatus) => STATUS_LABEL[v]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              <span
                className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[s])}
              />
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={askingEvidence} onOpenChange={setAskingEvidence}>
        <DialogContent>
          <DialogHeader>
            <div className="bg-primary/10 text-primary mb-1 grid size-11 place-items-center rounded-full">
              <PartyPopper className="size-5" />
            </div>
            <DialogTitle>¡Tarea completada!</DialogTitle>
            <DialogDescription>
              Cuenta qué se hizo y adjunta una captura: es el avance verificable
              que se necesita para poder marcarla como Hecha.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-xs">
              {error}
            </p>
          )}
          <EvidenceForm
            taskId={taskId}
            workspaceId={workspaceId}
            projectId={projectId}
            onCancel={() => setAskingEvidence(false)}
            onDone={() => {
              setAskingEvidence(false);
              applyStatus(IssueStatus.DONE);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function EvidenceForm({
  taskId,
  workspaceId,
  projectId,
  onCancel,
  onDone,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const canSave = body.trim().length > 0 || file !== null;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const fd = new FormData();
    fd.set("taskId", taskId);
    fd.set("workspaceId", workspaceId);
    fd.set("projectId", projectId);
    fd.set("body", body);
    if (file) fd.set("file", file);
    await addTaskProgressAction(fd);
    onDone();
  }

  return (
    <>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Ej: quedó listo el formulario y las validaciones…"
        className="bg-background focus:ring-ring transition-ios w-full resize-none rounded-2xl border p-3 text-sm outline-none focus:ring-2"
      />
      <label className="text-muted-foreground hover:text-foreground transition-ios flex cursor-pointer items-center gap-1.5 text-xs">
        <Camera className="size-3.5" />
        {file ? file.name : "Adjuntar captura (opcional)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <DialogFooter>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={save}
          disabled={saving || !canSave}
          className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
        >
          Guardar y completar
        </button>
      </DialogFooter>
    </>
  );
}
