"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ChevronDown,
  Minus,
  Pause,
  Play,
  Square,
  TriangleAlert,
} from "lucide-react";
import {
  useTimerWidget,
  usePersistedMinimized,
  usePersistedWidgetPosition,
} from "@/features/time/timer-widget-context";
import { ProgressComposer } from "@/features/time/components/progress-composer";
import { getMyWeekChartAction } from "@/server/actions/time";
import { todayKey } from "@/features/time/week";
import {
  MIN_BILLABLE_MINUTES,
  isBillableSession,
  progressTickRate,
  shortSessionNotice,
} from "@/features/time/timer-rules";
import { ProgressTimerPolicy } from "@/generated/prisma/enums";
import type { RunningTimerInfo } from "@/server/services/time";

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Tiempo mostrado. Mientras se documenta un avance el reloj no corre igual:
// con PAUSE se queda quieto y con HALF avanza a la mitad de velocidad.
function useElapsedMs(timer: RunningTimerInfo | null) {
  const [ms, setMs] = useState(0);
  const startedAt = timer?.startedAt;
  const accumulatedMinutes = timer?.accumulatedMinutes ?? 0;
  const pausedAt = timer?.pausedAt;
  const progressStartedAt = timer?.progressStartedAt;
  const policy = timer?.progressPolicy ?? ProgressTimerPolicy.PAUSE;

  useEffect(() => {
    const base = accumulatedMinutes * 60000;
    function tick() {
      if (progressStartedAt) {
        const rate = progressTickRate(policy);
        const since = Date.now() - new Date(progressStartedAt).getTime();
        setMs(base + Math.max(0, since) * rate);
        return;
      }
      if (pausedAt || !startedAt) {
        setMs(base);
        return;
      }
      setMs(base + Math.max(0, Date.now() - new Date(startedAt).getTime()));
    }
    tick();
    // Con el reloj congelado no hace falta seguir refrescando.
    if (pausedAt && !progressStartedAt) return;
    if (progressStartedAt && progressTickRate(policy) === 0) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, accumulatedMinutes, pausedAt, progressStartedAt, policy]);

  return ms;
}

const DEFAULT_POS = { x: 24, y: 24 }; // desde bottom-right

type Panel = "none" | "progress" | "short-warning";

export function TimerWidget() {
  const {
    timer,
    pending,
    notesCount,
    documenting,
    pause,
    resume,
    stop,
    cancel,
    beginProgress,
    endProgress,
    addProgress,
  } = useTimerWidget();
  const router = useRouter();
  const [minimized, setMinimized] = usePersistedMinimized();
  const [pos, setPos] = usePersistedWidgetPosition(DEFAULT_POS);
  const [panel, setPanel] = useState<Panel>("none");
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

  const elapsedMs = useElapsedMs(timer);

  if (!timer) return null;

  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const willCount = isBillableSession(elapsedMinutes);

  function onDragStart(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pos };
  }
  function onDragMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({
      x: Math.min(
        Math.max(dragRef.current.origin.x - dx, 8),
        window.innerWidth - 60,
      ),
      y: Math.min(
        Math.max(dragRef.current.origin.y - dy, 8),
        window.innerHeight - 60,
      ),
    });
  }
  function onDragEnd() {
    dragRef.current = null;
  }

  // La cámara lleva a las evidencias de la tarea que se está cronometrando:
  // allí se puede pegar la captura, adjuntar archivos y escribir el avance.
  async function goToTaskEvidence() {
    if (!timer) return;
    await beginProgress();
    setMinimized(true);
    router.push(
      `/w/${timer.workspaceId}/tasks/${timer.issueNumber}?avance=1#avances`,
    );
  }

  function handleStopClick() {
    if (!willCount) {
      setPanel("short-warning");
      return;
    }
    if (notesCount === 0) {
      setPanel("progress");
      return;
    }
    void stop();
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
        {documenting && (
          <span className="text-muted-foreground text-[10px] font-medium">
            {timer.progressPolicy === ProgressTimerPolicy.HALF ? "×½" : "‖"}
          </span>
        )}
      </button>
    );
  }

  const statusText = documenting
    ? timer.progressPolicy === ProgressTimerPolicy.HALF
      ? "Documentando · cuenta la mitad"
      : "Documentando · en pausa"
    : timer.pausedAt
      ? "En pausa"
      : "Trabajando en";

  return (
    <div
      style={{ right: pos.x, bottom: pos.y }}
      className="glass-strong animate-in fade-in-0 zoom-in-95 fixed z-50 w-80 rounded-[1.75rem] p-1 shadow-2xl"
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="flex cursor-grab touch-none items-center gap-2 px-3 pt-2 pb-1 active:cursor-grabbing"
      >
        <span className="relative flex size-2.5">
          {!documenting && !timer.pausedAt && (
            <span className="bg-primary/60 absolute inline-flex size-full animate-ping rounded-full" />
          )}
          <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
        </span>
        <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs font-medium">
          {statusText}{" "}
          {!documenting && !timer.pausedAt && (
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

      {/* La tarea siempre está: no se cronometra "en general", sino algo concreto. */}
      <button
        onClick={() =>
          router.push(`/w/${timer.workspaceId}/tasks/${timer.issueNumber}`)
        }
        className="hover:bg-accent/60 transition-ios mx-2 flex w-[calc(100%-1rem)] items-center gap-1.5 rounded-2xl px-2 py-1.5 text-left"
      >
        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
          #{timer.issueNumber}
        </span>
        <span className="truncate text-xs font-medium">{timer.issueTitle}</span>
      </button>

      <div className="px-4 py-2 text-center">
        <span className="font-mono text-4xl font-bold tabular-nums">
          {formatElapsed(elapsedMs)}
        </span>
        {!willCount && (
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            El tiempo empieza a contar a los {MIN_BILLABLE_MINUTES} min
          </p>
        )}
      </div>

      {chart && panel === "none" && (
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

      {panel === "short-warning" ? (
        <div className="space-y-2 p-3">
          <div className="text-muted-foreground flex gap-2 text-[11px]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p>{shortSessionNotice(elapsedMinutes)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPanel("none")}
              className="glass hover:bg-accent transition-ios flex-1 rounded-full py-2 text-xs font-medium"
            >
              Seguir trabajando
            </button>
            <button
              onClick={() => {
                setPanel("none");
                void stop();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/85 transition-ios flex-1 rounded-full py-2 text-xs font-medium"
            >
              Detener igual
            </button>
          </div>
        </div>
      ) : panel === "progress" ? (
        <div className="space-y-2 p-3 pt-0">
          <p className="text-muted-foreground px-1 text-[11px]">
            Documenta tu avance en{" "}
            <span className="text-foreground font-medium">
              #{timer.issueNumber}
            </span>
            . Queda como evidencia de la tarea.
          </p>
          <ProgressComposer
            compact
            rows={2}
            members={[]}
            placeholder="Ej: terminé el formulario de registro…"
            submitLabel="Guardar y detener"
            secondaryLabel="Omitir y detener"
            onSecondary={() => {
              setPanel("none");
              void endProgress().then(() => stop());
            }}
            onDirty={() => void beginProgress()}
            onSubmit={async (body, files) => {
              await addProgress(body, files);
              await endProgress();
              setPanel("none");
              await stop();
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={timer.pausedAt ? resume : pause}
            disabled={pending || documenting}
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
            onClick={goToTaskEvidence}
            disabled={pending}
            title="Adjuntar evidencia en la tarea"
            className="text-muted-foreground hover:bg-accent hover:text-foreground transition-ios flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-medium disabled:opacity-50"
          >
            <Camera className="size-3.5" />
            Evidencia
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

      {panel === "none" && (
        <div className="flex items-center justify-center gap-3 pb-1.5">
          <button
            onClick={() => setPanel("progress")}
            className="text-muted-foreground/80 hover:text-foreground transition-ios text-[11px]"
          >
            Avance rápido
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            onClick={cancel}
            disabled={pending}
            className="text-muted-foreground/70 hover:text-destructive transition-ios flex items-center gap-1 text-[11px] disabled:opacity-50"
          >
            <Minus className="size-3" />
            Descartar sesión
          </button>
        </div>
      )}
    </div>
  );
}
