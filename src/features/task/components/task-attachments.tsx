"use client";

import { useRef, useState, useTransition } from "react";
import {
  FileText,
  ImageIcon,
  Paperclip,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import {
  addTaskAttachmentAction,
  removeTaskAttachmentAction,
} from "@/server/actions/task";
import { Card } from "@/components/ui/card";

type Attachment = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy: { name: string | null; email: string } | null;
};

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (
    mimeType.includes("sheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("csv")
  )
    return FileSpreadsheet;
  return FileText;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Archivos, fotos y documentos propios de la tarea (independientes de los
// comentarios). Todo queda visible aunque la tarea ya esté Hecha.
export function TaskAttachments({
  taskId,
  workspaceId,
  projectId,
  attachments,
}: {
  taskId: string;
  workspaceId: string;
  projectId: string;
  attachments: Attachment[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.set("taskId", taskId);
          fd.set("workspaceId", workspaceId);
          fd.set("projectId", projectId);
          fd.set("file", file);
          await addTaskAttachmentAction(fd);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo subir el archivo.",
        );
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    });
  }

  return (
    <div className="space-y-3">
      <label className="text-muted-foreground hover:text-foreground transition-ios flex w-fit cursor-pointer items-center gap-1.5 text-xs">
        <Paperclip className="size-3.5" />
        {pending ? "Subiendo…" : "Adjuntar archivo, foto o documento"}
        <input
          ref={fileRef}
          type="file"
          multiple
          disabled={pending}
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
      </label>
      {error && <p className="text-destructive text-xs">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin archivos todavía.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {attachments.map((a) => {
            const Icon = iconFor(a.mimeType);
            return (
              <Card
                key={a.id}
                variant="glass"
                className="flex-row items-center gap-2.5 p-3"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-xl">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{a.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatSize(a.size)}
                      {a.uploadedBy &&
                        ` · ${a.uploadedBy.name?.trim() || a.uploadedBy.email}`}
                    </span>
                  </span>
                </a>
                <button
                  onClick={() =>
                    startTransition(() =>
                      removeTaskAttachmentAction({
                        attachmentId: a.id,
                        workspaceId,
                        projectId,
                      }),
                    )
                  }
                  aria-label="Eliminar archivo"
                  className="text-muted-foreground hover:text-destructive transition-ios shrink-0"
                >
                  <Trash2 className="size-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
