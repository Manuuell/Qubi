"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Camera, ChevronDown, Minus, Pause, Play, Square } from "lucide-react";
import {
  useTimerWidget,
  usePersistedMinimized,
  usePersistedWidgetPosition,
} from "@/features/time/timer-widget-context";
import { getMyWeekChartAction } from "@/server/actions/time";
import { todayKey } from "@/features/time/week";

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function useElapsedMs(
  startedAt: Date,
  accumulatedMinutes: number,
  paused: boolean,
) {
  const [ms, setMs] = useState(0);

  useEffect(() => {
    function tick() {
      const running = paused ? 0 : Date.now() - new Date(startedAt).getTime();
      setMs(accumulatedMinutes * 60000 + Math.max(0, running));
    }
    tick();
    if (paused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, accumulatedMinutes, paused]);

  return ms;
}

const DEFAULT_POS = { x: 24, y: 24 }; // desde bottom-right

export function TimerWidget() {
  const { timer, pending, notesCount, pause, resume, stop, cancel, addNote } =
    useTimerWidget();
  const [minimized, setMinimized] = usePersistedMinimized();
  const [pos, setPos] = usePersistedWidgetPosition(DEFAULT_POS);
  const [askingNote, setAskingNote] = useState(false);
  const [chart, setChart] = useState<{
    dayKeys: string[];
    dayTotals: number[];
  } | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: typeof pos;
  } | null>(null);

  useEffect(() => {
    if (!timer) return;
    getMyWeekChartAction(timer.workspaceId)
      .then(setChart)
      .catch(() => setChart(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer?.workspaceId, timer?.sessionId]);

  const elapsedMs = useElapsedMs(
    timer?.startedAt ?? new Date(),
    timer?.accumulatedMinutes ?? 0,
    Boolean(timer?.pausedAt),
  );

  if (!timer) return null;

  function onDragStart(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pos };
  }
  function onDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = {
      x: Math.min(
        Math.max(dragRef.current.origin.x - dx, 8),
        window.innerWidth - 60,
      ),
      y: Math.min(
        Math.max(dragRef.current.origin.y - dy, 8),
        window.innerHeight - 60,
      ),
    };
    setPos(next);
  }
  function onDragEnd() {
    dragRef.current = null;
  }

  function handleStopClick() {
    if (notesCount === 0) {
      setAskingNote(true);
      return;
    }
    stop();
  }

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{ right: pos.x, bottom: pos.y }}
        className="glass-strong transition-ios fixed z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-lg active:scale-95"
      >
        <span className="relative flex size-2.5">
          <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
          <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
        </span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
      </button>
    );
  }

  return (
    <div
      style={{ right: pos.x, bottom: pos.y }}
      className="glass-strong animate-in fade-in-0 zoom-in-95 fixed z-50 w-72 rounded-[1.75rem] p-1 shadow-2xl"
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="flex cursor-grab touch-none items-center gap-2 px-3 pt-2 pb-1 active:cursor-grabbing"
      >
        <span className="relative flex size-2.5">
          <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
          <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
        </span>
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium">
          {timer.pausedAt ? "En pausa" : "Trabajando en"}{" "}
          {timer.projectName && (
            <span className="text-foreground">{timer.projectName}</span>
          )}
        </p>
        <button
          onClick={() => setMinimized(true)}
          aria-label="Minimizar"
          className="hover:bg-accent transition-ios grid size-6 place-items-center rounded-full"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      <div className="px-4 py-2 text-center">
        <span className="font-mono text-4xl font-bold tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
      </div>

      {chart && (
        <div className="flex h-10 items-end gap-1 px-4">
          {chart.dayTotals.map((min, i) => {
            const max = Math.max(1, ...chart.dayTotals);
            const pct = Math.max(6, Math.round((min / max) * 100));
            const isToday = chart.dayKeys[i] === todayKey();
            return (
              <div key={chart.dayKeys[i]} className="flex-1">
                <div
                  className="transition-ios mx-auto w-full rounded-full"
                  style={{
                    height: `${pct}%`,
                    background: isToday
                      ? "var(--primary)"
                      : "color-mix(in oklab, var(--primary) 25%, transparent)",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {askingNote ? (
        <NoteForm
          onSkip={() => {
            setAskingNote(false);
            stop();
          }}
          onSaved={async (body, file) => {
            await addNote(body, file);
            setAskingNote(false);
            stop();
          }}
        />
      ) : (
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={timer.pausedAt ? resume : pause}
            disabled={pending}
            aria-label={timer.pausedAt ? "Reanudar" : "Pausar"}
            className="hover:bg-accent transition-ios glass grid size-11 place-items-center rounded-full disabled:opacity-50"
          >
            {timer.pausedAt ? (
              <Play className="size-4.5" fill="currentColor" />
            ) : (
              <Pause className="size-4.5" fill="currentColor" />
            )}
          </button>
          <button
            onClick={() => setAskingNote(true)}
            disabled={pending}
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-medium disabled:opacity-50"
          >
            <Camera className="size-3.5" />+ Avance
          </button>
          <button
            onClick={handleStopClick}
            disabled={pending}
            aria-label="Detener y guardar"
            title="Detener y guardar"
            className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios grid size-11 place-items-center rounded-full shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Square className="size-4" fill="currentColor" />
          </button>
        </div>
      )}

      {!askingNote && (
        <div className="flex justify-center pb-1.5">
          <button
            onClick={cancel}
            disabled={pending}
            className="text-muted-foreground/70 hover:text-destructive transition-ios flex items-center gap-1 text-[11px] disabled:opacity-50"
          >
            <Minus className="size-3" />
            Descartar sesión (no guarda tiempo)
          </button>
        </div>
      )}
    </div>
  );
}

function NoteForm({
  onSkip,
  onSaved,
}: {
  onSkip: () => void;
  onSaved: (body: string, file: File | null) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-2 p-3 pt-0">
      <p className="text-muted-foreground px-1 text-xs">
        Cuenta qué avanzaste en esta sesión (puedes omitirlo).
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Ej: terminé el formulario de registro…"
        className="bg-card border-border/60 focus:ring-ring w-full resize-none rounded-2xl border px-3 py-2 text-sm outline-none focus:ring-2"
      />
      <label className="text-muted-foreground hover:text-foreground transition-ios flex cursor-pointer items-center gap-1.5 px-1 text-xs">
        <Camera className="size-3.5" />
        {file ? file.name : "Adjuntar captura (opcional)"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSkip}
          disabled={saving}
          className="text-muted-foreground hover:bg-accent transition-ios flex-1 rounded-full py-2 text-xs font-medium disabled:opacity-50"
        >
          Omitir y detener
        </button>
        <button
          onClick={async () => {
            setSaving(true);
            await onSaved(body, file);
          }}
          disabled={saving || (!body.trim() && !file)}
          className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios flex-1 rounded-full py-2 text-xs font-medium disabled:opacity-50"
        >
          Guardar y detener
        </button>
      </div>
    </div>
  );
}
