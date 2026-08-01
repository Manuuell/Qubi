"use client";

import {
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type FormEvent,
} from "react";
import { Link2, Paperclip, X } from "lucide-react";
import { MentionTextarea } from "@/features/mentions/mention-textarea";
import type { MentionMember } from "@/features/mentions/mentions";

// Redactor de avances: texto (con menciones y enlaces) + evidencia adjunta.
// La evidencia se puede PEGAR desde el portapapeles (una captura copiada de
// fuera), arrastrar o elegir del disco, y admite cualquier tipo de archivo.
// Se usa igual desde el widget del cronómetro y desde el detalle de la tarea.

const MAX_FILES = 5;

function prettySize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProgressComposer({
  members = [],
  placeholder,
  submitLabel = "Guardar avance",
  secondaryLabel,
  onSecondary,
  onSubmit,
  onDirty,
  rows = 3,
  compact = false,
}: {
  members?: MentionMember[];
  placeholder?: string;
  submitLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onSubmit: (body: string, files: File[]) => Promise<void>;
  /** Se avisa la primera vez que la persona empieza a redactar. */
  onDirty?: () => void;
  rows?: number;
  compact?: boolean;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirtyRef = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markDirty() {
    if (dirtyRef.current) return;
    dirtyRef.current = true;
    onDirty?.();
  }

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    markDirty();
    setError(null);
    setFiles((prev) => {
      const next = [...prev, ...incoming];
      if (next.length > MAX_FILES) {
        setError(`Puedes adjuntar hasta ${MAX_FILES} archivos por avance.`);
        return next.slice(0, MAX_FILES);
      }
      return next;
    });
  }

  function handlePaste(e: ReactClipboardEvent<HTMLFormElement>) {
    const pasted = Array.from(e.clipboardData?.files ?? []);
    if (pasted.length === 0) return;
    e.preventDefault();
    // Las capturas pegadas llegan sin nombre útil ("image.png"): se les pone
    // uno con la hora para que se distingan en la lista de archivos.
    addFiles(
      pasted.map((f) =>
        f.name && f.name !== "image.png"
          ? f
          : new File([f], `captura-${Date.now()}.png`, { type: f.type }),
      ),
    );
  }

  function handleDrop(e: ReactDragEvent<HTMLFormElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer?.files ?? []));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = textRef.current?.value ?? "";
    if (!body.trim() && files.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(body, files);
      if (textRef.current) textRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
      setFiles([]);
      dirtyRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`space-y-2 ${dragging ? "ring-primary rounded-2xl ring-2" : ""}`}
    >
      <MentionTextarea
        ref={textRef}
        members={members}
        rows={rows}
        placeholder={
          placeholder ?? "¿Qué avanzaste? Puedes pegar enlaces y capturas…"
        }
        className={`bg-background focus:ring-ring transition-ios w-full resize-none rounded-2xl border p-3 outline-none focus:ring-2 ${
          compact ? "text-xs" : "text-sm"
        }`}
      />

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="glass flex max-w-full items-center gap-1.5 rounded-full py-1 pr-1 pl-2.5 text-[11px]"
            >
              <span className="truncate">{file.name}</span>
              <span className="text-muted-foreground shrink-0">
                {prettySize(file.size)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setFiles((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label={`Quitar ${file.name}`}
                className="hover:bg-accent hover:text-destructive transition-ios grid size-4 shrink-0 place-items-center rounded-full"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-muted-foreground hover:text-foreground transition-ios flex cursor-pointer items-center gap-1.5 text-xs">
          <Paperclip className="size-3.5" />
          Adjuntar archivos
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>
        <div className="flex items-center gap-2">
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondary}
              disabled={saving}
              className="text-muted-foreground hover:bg-accent transition-ios rounded-full px-3 py-2 text-xs font-medium disabled:opacity-50"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios rounded-full px-4 py-2 text-xs font-medium shadow-sm active:scale-95 disabled:opacity-50"
          >
            {saving ? "Guardando…" : submitLabel}
          </button>
        </div>
      </div>

      <p className="text-muted-foreground/80 flex items-center gap-1 text-[11px]">
        <Link2 className="size-3" />
        Pega una captura con ⌘/Ctrl+V, arrastra archivos o escribe enlaces: se
        guardan como evidencia de la tarea.
      </p>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
}
