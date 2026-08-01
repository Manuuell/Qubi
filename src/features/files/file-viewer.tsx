"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ViewableFile = {
  url: string;
  name: string;
  mimeType: string;
};

function kindOf(mimeType: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ["xlsx", "xls", "csv"].includes(ext)
  )
    return "sheet";
  if (
    mimeType.includes("wordprocessingml") ||
    mimeType === "application/msword" ||
    ext === "docx"
  )
    return "word";
  return "other";
}

// Panel bonito para ver archivos dentro de la app: fotos, PDF, Excel y Word
// se renderizan en un visor propio en vez de descargarse a otra aplicación.
export function FileViewer({
  file,
  onClose,
}: {
  file: ViewableFile | null;
  onClose: () => void;
}) {
  const kind = file ? kindOf(file.mimeType, file.name) : "other";

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showClose
        className="flex max-h-[85vh] w-full max-w-3xl flex-col p-0"
      >
        {file && (
          <>
            <DialogHeader className="flex-row items-center justify-between border-b px-5 py-3.5 text-left">
              <DialogTitle className="min-w-0 truncate pr-8 text-sm">
                {file.name}
              </DialogTitle>
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                download={file.name}
                className="text-muted-foreground hover:text-foreground transition-ios mr-8 flex shrink-0 items-center gap-1.5 text-xs"
              >
                <Download className="size-3.5" />
                Descargar
              </a>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-auto p-5">
              {kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt={file.name}
                  className="mx-auto max-h-full max-w-full rounded-xl object-contain"
                />
              )}
              {kind === "pdf" && (
                <iframe
                  src={file.url}
                  title={file.name}
                  className="h-[70vh] w-full rounded-xl border"
                />
              )}
              {kind === "sheet" && (
                <SheetPreview key={file.url} url={file.url} />
              )}
              {kind === "word" && <WordPreview key={file.url} url={file.url} />}
              {kind === "other" && (
                <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center text-sm">
                  <ExternalLink className="size-6" />
                  No hay vista previa para este tipo de archivo.
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Abrir en una pestaña nueva
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SheetPreview({ url }: { url: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; sheets: { name: string; rows: unknown[][] }[] }
  >({ status: "loading" });
  const [activeSheet, setActiveSheet] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const XLSX = await import("xlsx");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheets = wb.SheetNames.map((name) => ({
          name,
          rows: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
            header: 1,
            blankrows: false,
          }),
        }));
        if (!cancelled) setState({ status: "ready", sheets });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando hoja de cálculo…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        No se pudo leer este archivo.
      </p>
    );
  }

  const sheet = state.sheets[activeSheet];

  return (
    <div>
      {state.sheets.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {state.sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActiveSheet(i)}
              className={`transition-ios rounded-full px-3 py-1 text-xs font-medium ${
                i === activeSheet
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {sheet.rows.map((row, ri) => (
              <tr
                key={ri}
                className={
                  ri === 0 ? "bg-muted font-medium" : "odd:bg-muted/30"
                }
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="border-border/60 border px-2.5 py-1.5 whitespace-nowrap"
                  >
                    {cell == null ? "" : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WordPreview({ url }: { url: string }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "ready"; html: string }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mammoth = await import("mammoth");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
        if (!cancelled) setState({ status: "ready", html: value });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === "loading") {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Cargando documento…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        No se pudo leer este archivo.
      </p>
    );
  }

  return (
    <div
      className="bg-card mx-auto max-w-2xl rounded-xl p-8 text-sm leading-relaxed shadow-sm [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_table]:border-collapse [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: state.html }}
    />
  );
}
