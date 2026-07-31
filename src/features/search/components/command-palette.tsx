"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, FileText, Search } from "lucide-react";

type Result = {
  id: string;
  title: string;
  type: "PAGE" | "DATABASE";
  workspaceId: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);
  const router = useRouter();

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  // Mantener un ref con el estado de apertura (sin setState en efecto).
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Abrir/cerrar con Cmd/Ctrl+K y cerrar con Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) close();
        else setOpen(true);
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Enfocar el input al abrir.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Búsqueda con debounce.
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) setResults((await res.json()) as Result[]);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  function go(r: Result) {
    close();
    router.push(`/w/${r.workspaceId}/${r.id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-sm"
      >
        <Search className="size-4" />
        Buscar
        <kbd className="bg-card ml-auto rounded-full border px-1.5 text-[10px]">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="animate-in fade-in-0 fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[15vh] backdrop-blur-sm duration-150"
          onClick={() => close()}
        >
          <div
            className="glass-strong animate-in fade-in-0 zoom-in-95 w-full max-w-lg overflow-hidden rounded-3xl duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border/60 flex items-center gap-2 border-b px-4">
              <Search className="text-muted-foreground size-4" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar páginas…"
                className="w-full bg-transparent py-3.5 text-sm outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                  {query.trim() ? "Sin resultados" : "Escribe para buscar"}
                </li>
              ) : (
                results.map((r) => {
                  const Icon = r.type === "DATABASE" ? Database : FileText;
                  return (
                    <li key={r.id}>
                      <button
                        onClick={() => go(r)}
                        className="hover:bg-accent transition-ios flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm"
                      >
                        <Icon className="text-muted-foreground size-4 shrink-0" />
                        <span className="truncate">
                          {r.title || "Sin título"}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
