"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { RunningTimerInfo } from "@/server/services/time";
import {
  addSessionProgressAction,
  beginTimerProgressAction,
  cancelTimerAction,
  endTimerProgressAction,
  pauseTimerAction,
  resumeTimerAction,
  startTimerAction,
  stopTimerAction,
} from "@/server/actions/timer";
import { TimerWidget } from "@/features/time/components/timer-widget";
import { TimerNotice } from "@/features/time/components/timer-notice";
import { shortSessionNotice } from "@/features/time/timer-rules";
import { hoursLabel } from "@/features/time/week";

type TimerState = RunningTimerInfo | null;

// Resultado de detener el cronómetro: la UI lo usa para avisar cuando la
// sesión fue demasiado corta y no se guardó como horas.
export type StopResult = {
  minutes: number;
  countedMinutes: number;
  discarded: boolean;
} | null;

// Para arrancar basta con decir en qué espacio, proyecto y TAREA se trabaja:
// el resto (nombre, número, política) lo devuelve el servidor.
export type TimerTarget = {
  workspaceId: string;
  projectId: string;
  issueId: string;
};

type TimerWidgetContextValue = {
  timer: TimerState;
  pending: boolean;
  notesCount: number;
  /** El cronómetro está en modo "documentando avance" (pausado o a la mitad). */
  documenting: boolean;
  start: (target: TimerTarget) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<StopResult>;
  cancel: () => void;
  beginProgress: () => Promise<void>;
  endProgress: () => Promise<void>;
  addProgress: (body: string, files: File[]) => Promise<void>;
};

const TimerWidgetContext = createContext<TimerWidgetContextValue | null>(null);

export function useTimerWidget() {
  const ctx = useContext(TimerWidgetContext);
  if (!ctx) throw new Error("useTimerWidget debe usarse dentro del provider");
  return ctx;
}

// Igual que useTimerWidget pero sin reventar fuera del provider: para
// componentes que también se renderizan en pantallas sin cronómetro.
export function useOptionalTimerWidget() {
  return useContext(TimerWidgetContext);
}

const POSITION_KEY = "qubi:timer-widget:position";
const MINIMIZED_KEY = "qubi:timer-widget:minimized";

export function TimerWidgetProvider({
  initialTimer,
  children,
}: {
  initialTimer: RunningTimerInfo | null;
  children: ReactNode;
}) {
  const [timer, setTimer] = useState<TimerState>(initialTimer);
  const [notesCount, setNotesCount] = useState(0);
  // Si el reloj ya estaba pausado a mano antes de documentar, al terminar debe
  // seguir pausado en vez de arrancar solo.
  const [pausedBeforeProgress, setPausedBeforeProgress] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = useCallback((target: TimerTarget) => {
    startTransition(async () => {
      const running = await startTimerAction({
        workspaceId: target.workspaceId,
        projectId: target.projectId,
        issueId: target.issueId,
      });
      setNotesCount(0);
      setTimer(running);
    });
  }, []);

  const pause = useCallback(() => {
    if (!timer) return;
    const workspaceId = timer.workspaceId;
    setTimer((prev) =>
      prev
        ? {
            ...prev,
            pausedAt: new Date(),
            accumulatedMinutes:
              prev.accumulatedMinutes +
              Math.max(
                0,
                Math.round(
                  (Date.now() - new Date(prev.startedAt).getTime()) / 60000,
                ),
              ),
          }
        : prev,
    );
    startTransition(() => pauseTimerAction({ workspaceId }));
  }, [timer]);

  const resume = useCallback(() => {
    if (!timer) return;
    const workspaceId = timer.workspaceId;
    setTimer((prev) =>
      prev ? { ...prev, pausedAt: null, startedAt: new Date() } : prev,
    );
    startTransition(() => resumeTimerAction({ workspaceId }));
  }, [timer]);

  // Entra en modo documentando: el servidor congela el tiempo corrido y marca
  // desde cuándo se está escribiendo el avance.
  const beginProgress = useCallback(async () => {
    if (!timer || timer.progressStartedAt) return;
    const now = new Date();
    setPausedBeforeProgress(Boolean(timer.pausedAt));
    setTimer((prev) =>
      prev
        ? {
            ...prev,
            progressStartedAt: now,
            accumulatedMinutes: prev.pausedAt
              ? prev.accumulatedMinutes
              : prev.accumulatedMinutes +
                Math.max(
                  0,
                  Math.round(
                    (Date.now() - new Date(prev.startedAt).getTime()) / 60000,
                  ),
                ),
          }
        : prev,
    );
    await beginTimerProgressAction();
  }, [timer]);

  const endProgress = useCallback(async () => {
    if (!timer?.progressStartedAt) return;
    const wasPaused = pausedBeforeProgress;
    const result = await endTimerProgressAction({ wasPaused });
    setPausedBeforeProgress(false);
    setTimer((prev) =>
      prev
        ? {
            ...prev,
            progressStartedAt: null,
            startedAt: new Date(),
            pausedAt: wasPaused ? new Date() : null,
            accumulatedMinutes:
              prev.accumulatedMinutes + (result?.credited ?? 0),
          }
        : prev,
    );
  }, [timer, pausedBeforeProgress]);

  const stop = useCallback(async (): Promise<StopResult> => {
    if (!timer) return null;
    const workspaceId = timer.workspaceId;
    const result = await stopTimerAction({ workspaceId });
    setTimer(null);
    setNotesCount(0);
    setPausedBeforeProgress(false);
    if (result) {
      // El aviso vive fuera del widget porque el widget desaparece al parar.
      setNotice(
        result.discarded
          ? shortSessionNotice(result.minutes)
          : `Sesión guardada: ${hoursLabel(result.countedMinutes)} en ${timer.projectName}.`,
      );
    }
    return result
      ? {
          minutes: result.minutes,
          countedMinutes: result.countedMinutes,
          discarded: result.discarded,
        }
      : null;
  }, [timer]);

  const cancel = useCallback(() => {
    if (!timer) return;
    const workspaceId = timer.workspaceId;
    startTransition(async () => {
      await cancelTimerAction({ workspaceId });
      setTimer(null);
      setNotesCount(0);
    });
  }, [timer]);

  const addProgress = useCallback(
    async (body: string, files: File[]) => {
      if (!timer) return;
      const fd = new FormData();
      fd.set("sessionId", timer.sessionId);
      fd.set("workspaceId", timer.workspaceId);
      fd.set("body", body);
      for (const file of files) fd.append("files", file);
      await addSessionProgressAction(fd);
      setNotesCount((n) => n + 1);
    },
    [timer],
  );

  return (
    <TimerWidgetContext.Provider
      value={{
        timer,
        pending,
        notesCount,
        documenting: Boolean(timer?.progressStartedAt),
        start,
        pause,
        resume,
        stop,
        cancel,
        beginProgress,
        endProgress,
        addProgress,
      }}
    >
      {children}
      {timer && <TimerWidget />}
      {notice && (
        <TimerNotice message={notice} onClose={() => setNotice(null)} />
      )}
    </TimerWidgetContext.Provider>
  );
}

export function usePersistedWidgetPosition(defaultPos: {
  x: number;
  y: number;
}) {
  const [pos, setPos] = useState(defaultPos);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de localStorage, solo existe en el cliente
      if (raw) setPos(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const save = useCallback((next: { x: number; y: number }) => {
    setPos(next);
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  return [pos, save] as const;
}

export function usePersistedMinimized() {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MINIMIZED_KEY) === "1";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de localStorage, solo existe en el cliente
      setMinimized(stored);
    } catch {
      // ignore
    }
  }, []);

  const save = useCallback((next: boolean) => {
    setMinimized(next);
    try {
      localStorage.setItem(MINIMIZED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  return [minimized, save] as const;
}
