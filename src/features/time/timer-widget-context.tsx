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
  addWorkSessionNoteAction,
  cancelTimerAction,
  pauseTimerAction,
  resumeTimerAction,
  startTimerAction,
  stopTimerAction,
} from "@/server/actions/timer";
import { TimerWidget } from "@/features/time/components/timer-widget";

type TimerState = RunningTimerInfo | null;

type TimerWidgetContextValue = {
  timer: TimerState;
  pending: boolean;
  notesCount: number;
  start: (workspaceId: string, projectId: string, projectName: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  cancel: () => void;
  addNote: (body: string, file: File | null) => Promise<void>;
};

const TimerWidgetContext = createContext<TimerWidgetContextValue | null>(null);

export function useTimerWidget() {
  const ctx = useContext(TimerWidgetContext);
  if (!ctx) throw new Error("useTimerWidget debe usarse dentro del provider");
  return ctx;
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
  const [pending, startTransition] = useTransition();

  const start = useCallback(
    (workspaceId: string, projectId: string, projectName: string) => {
      startTransition(async () => {
        const { sessionId } = await startTimerAction({
          workspaceId,
          projectId,
        });
        setNotesCount(0);
        setTimer({
          sessionId,
          projectId,
          projectName,
          workspaceId,
          startedAt: new Date(),
          accumulatedMinutes: 0,
          pausedAt: null,
        });
      });
    },
    [],
  );

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

  const stop = useCallback(() => {
    if (!timer) return;
    const workspaceId = timer.workspaceId;
    startTransition(async () => {
      await stopTimerAction({ workspaceId });
      setTimer(null);
      setNotesCount(0);
    });
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

  const addNote = useCallback(
    async (body: string, file: File | null) => {
      if (!timer) return;
      const fd = new FormData();
      fd.set("sessionId", timer.sessionId);
      fd.set("workspaceId", timer.workspaceId);
      fd.set("body", body);
      if (file) fd.set("file", file);
      await addWorkSessionNoteAction(fd);
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
        start,
        pause,
        resume,
        stop,
        cancel,
        addNote,
      }}
    >
      {children}
      {timer && <TimerWidget />}
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
