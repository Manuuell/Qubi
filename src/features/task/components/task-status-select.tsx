"use client";

import { useState, useTransition } from "react";
import { Camera, PartyPopper } from "lucide-react";
import { IssueStatus } from "@/generated/prisma/enums";
import { STATUS_DOT, STATUS_LABEL, STATUS_ORDER } from "@/features/task/labels";
import {
  addTaskCommentAction,
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

  function applyStatus(next: IssueStatus) {
    startTransition(() =>
      setTaskStatusAction({ taskId, workspaceId, projectId, status: next }),
    );
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
              Cuenta qué se hizo y adjunta una captura si quieres dejar
              evidencia (puedes omitirlo).
            </DialogDescription>
          </DialogHeader>
          <EvidenceForm
            taskId={taskId}
            workspaceId={workspaceId}
            projectId={projectId}
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
  onDone,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  onDone: () => void;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    if (body.trim() || file) {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("workspaceId", workspaceId);
      fd.set("projectId", projectId);
      fd.set("body", body);
      if (file) fd.set("file", file);
      await addTaskCommentAction(fd);
    }
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
          onClick={onDone}
          disabled={saving}
          className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Omitir
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-5 py-2 text-sm font-medium shadow-sm active:scale-95 disabled:opacity-50"
        >
          Guardar y completar
        </button>
      </DialogFooter>
    </>
  );
}
