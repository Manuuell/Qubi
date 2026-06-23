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
        className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
      >
        <Search className="size-4" />
        Buscar
        <kbd className="bg-muted ml-auto rounded border px-1 text-[10px]">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          onClick={() => close()}
        >
          <div
            className="bg-background w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="text-muted-foreground size-4" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar páginas…"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-1">
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
                        className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
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
