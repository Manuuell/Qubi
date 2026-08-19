"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseIso(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

// Selector de fecha propio, estilo glass (reemplaza el <input type="date">
// nativo del navegador, que rompe la identidad visual del sistema).
export function DatePicker({
  value,
  onChange,
  disabled,
  ariaLabel,
  placeholder = "Sin fecha",
  className,
  fullWidth = false,
}: {
  value: string; // "" o "YYYY-MM-DD"
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  // Por defecto es una píldora compacta, que es como se usa junto al título de
  // una tarea. En un formulario, donde el resto de campos son cajas a todo el
  // ancho, queda descolgada: fullWidth lo hace ocupar la columna entera.
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const parsed = parseIso(value);
  const [cursor, setCursor] = useState({
    y: parsed?.y ?? today.getFullYear(),
    m: parsed?.m ?? today.getMonth(),
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function toggle() {
    if (disabled) return;
    if (!open) {
      const p = parseIso(value);
      setCursor({
        y: p?.y ?? today.getFullYear(),
        m: p?.m ?? today.getMonth(),
      });
    }
    setOpen((o) => !o);
  }

  const firstWeekday = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

  const label = parsed
    ? new Date(parsed.y, parsed.m, parsed.d).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : placeholder;

  return (
    <div
      className={cn("relative", fullWidth ? "block w-full" : "inline-block")}
      ref={containerRef}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "border-input bg-background hover:bg-accent transition-ios flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs outline-none disabled:opacity-50",
          fullWidth && "w-full rounded-xl px-3 py-1.5 text-sm",
          !parsed && "text-muted-foreground",
          className,
        )}
      >
        <CalendarDays className="size-3.5" />
        {label}
      </button>

      {open && (
        <div className="glass-strong animate-in fade-in-0 zoom-in-95 absolute top-full left-0 z-30 mt-2 w-64 rounded-3xl p-3 duration-150">
          <div className="mb-2 flex items-center gap-1">
            <span className="font-heading flex-1 text-sm font-semibold capitalize">
              {MONTHS[cursor.m]} {cursor.y}
            </span>
            <button
              type="button"
              onClick={() =>
                setCursor((c) =>
                  c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 },
                )
              }
              aria-label="Mes anterior"
              className="hover:bg-accent transition-ios grid size-6 place-items-center rounded-full"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setCursor((c) =>
                  c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 },
                )
              }
              aria-label="Mes siguiente"
              className="hover:bg-accent transition-ios grid size-6 place-items-center rounded-full"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                className="text-muted-foreground py-1 text-center text-[10px] font-medium"
              >
                {d}
              </div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dayIso = iso(cursor.y, cursor.m, day);
              const selected = dayIso === value;
              const isToday = dayIso === todayIso;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    onChange(dayIso);
                    setOpen(false);
                  }}
                  className={cn(
                    "transition-ios grid size-8 place-items-center rounded-full text-xs active:scale-90",
                    selected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isToday
                        ? "text-primary font-semibold"
                        : "hover:bg-accent",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="border-border/60 mt-2 flex items-center gap-2 border-t pt-2">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                setCursor({ y: t.getFullYear(), m: t.getMonth() });
                onChange(iso(t.getFullYear(), t.getMonth(), t.getDate()));
                setOpen(false);
              }}
              className="text-primary hover:bg-primary/10 transition-ios rounded-full px-2.5 py-1 text-xs font-medium"
            >
              Hoy
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
              >
                <X className="size-3" />
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
