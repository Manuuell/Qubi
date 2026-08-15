import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueStatus, ProgressTimerPolicy } from "@/generated/prisma/enums";

// La máquina de estados del temporizador (startTimer/pauseTimer/resumeTimer/
// stopTimer/cancelTimer/beginTimerProgress/endTimerProgress) solo tenía
// cubiertas sus funciones puras auxiliares (timer-rules.test.ts). Estos
// tests mockean Prisma para probar la lógica de transición de estados sin
// necesitar una base de datos real.

const prismaMock = {
  project: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  issue: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  runningTimer: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workSession: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  timeEntry: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/server/services/task", () => ({
  startTask: vi.fn(),
  addTaskComment: vi.fn(),
}));
vi.mock("@/server/lib/permissions", () => ({
  assertCanEditTimeManually: vi.fn(),
  assertWorkspaceAdmin: vi.fn(),
  assertWorkspaceMember: vi.fn(),
  getWorkspaceRole: vi.fn(),
}));

const { startTask } = await import("@/server/services/task");
const {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  cancelTimer,
  beginTimerProgress,
  endTimerProgress,
  getRunningTimer,
} = await import("@/server/services/time");

const WORKSPACE_ID = "ws-1";
const USER_ID = "user-1";
const PROJECT_ID = "project-1";
const ISSUE_ID = "issue-1";
const SESSION_ID = "session-1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("startTimer", () => {
  it("falla si el proyecto no existe en el espacio", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    await expect(
      startTimer(WORKSPACE_ID, USER_ID, PROJECT_ID, ISSUE_ID),
    ).rejects.toThrow("Proyecto no encontrado");
  });

  it("falla si la tarea no pertenece al proyecto/espacio", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    prismaMock.issue.findFirst.mockResolvedValue(null);
    await expect(
      startTimer(WORKSPACE_ID, USER_ID, PROJECT_ID, ISSUE_ID),
    ).rejects.toThrow("Elige una tarea de este proyecto para cronometrar");
  });

  it("falla si la tarea ya está terminada", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    prismaMock.issue.findFirst.mockResolvedValue({
      id: ISSUE_ID,
      status: IssueStatus.DONE,
    });
    await expect(
      startTimer(WORKSPACE_ID, USER_ID, PROJECT_ID, ISSUE_ID),
    ).rejects.toThrow("Esa tarea ya está terminada");
  });

  it("falla si ya hay un temporizador en marcha", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    prismaMock.issue.findFirst.mockResolvedValue({
      id: ISSUE_ID,
      status: IssueStatus.TODO,
    });
    prismaMock.runningTimer.findUnique.mockResolvedValue({ userId: USER_ID });
    await expect(
      startTimer(WORKSPACE_ID, USER_ID, PROJECT_ID, ISSUE_ID),
    ).rejects.toThrow("Ya tienes un temporizador en marcha");
  });

  it("pasa la tarea TODO a en curso y crea sesión + temporizador", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    prismaMock.issue.findFirst.mockResolvedValue({
      id: ISSUE_ID,
      status: IssueStatus.TODO,
    });
    prismaMock.runningTimer.findUnique.mockResolvedValue(null);
    prismaMock.workSession.create.mockResolvedValue({ id: SESSION_ID });
    prismaMock.runningTimer.create.mockResolvedValue({});

    const sessionId = await startTimer(
      WORKSPACE_ID,
      USER_ID,
      PROJECT_ID,
      ISSUE_ID,
    );

    expect(sessionId).toBe(SESSION_ID);
    expect(startTask).toHaveBeenCalledWith(ISSUE_ID, USER_ID);
    expect(prismaMock.runningTimer.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        projectId: PROJECT_ID,
        issueId: ISSUE_ID,
        sessionId: SESSION_ID,
      },
    });
  });

  it("no reinicia la tarea si ya estaba en curso", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: PROJECT_ID });
    prismaMock.issue.findFirst.mockResolvedValue({
      id: ISSUE_ID,
      status: IssueStatus.IN_PROGRESS,
    });
    prismaMock.runningTimer.findUnique.mockResolvedValue(null);
    prismaMock.workSession.create.mockResolvedValue({ id: SESSION_ID });
    prismaMock.runningTimer.create.mockResolvedValue({});

    await startTimer(WORKSPACE_ID, USER_ID, PROJECT_ID, ISSUE_ID);

    expect(startTask).not.toHaveBeenCalled();
  });
});

describe("pauseTimer / resumeTimer", () => {
  it("pauseTimer congela lo corrido del tramo actual", async () => {
    const startedAt = new Date("2026-01-01T10:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:05:00Z")); // +5 min

    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      startedAt,
      accumulatedMinutes: 20,
      pausedAt: null,
    });

    await pauseTimer(USER_ID);

    expect(prismaMock.runningTimer.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({ accumulatedMinutes: 25 }),
    });
  });

  it("pauseTimer es un no-op si ya estaba pausado", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      pausedAt: new Date(),
    });
    await pauseTimer(USER_ID);
    expect(prismaMock.runningTimer.update).not.toHaveBeenCalled();
  });

  it("resumeTimer reanuda solo si estaba pausado", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      pausedAt: new Date(),
    });
    await resumeTimer(USER_ID);
    expect(prismaMock.runningTimer.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({ pausedAt: null }),
    });
  });

  it("resumeTimer es un no-op si ya estaba corriendo", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      pausedAt: null,
    });
    await resumeTimer(USER_ID);
    expect(prismaMock.runningTimer.update).not.toHaveBeenCalled();
  });
});

describe("stopTimer", () => {
  function mockTimer(overrides: Record<string, unknown> = {}) {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      sessionId: SESSION_ID,
      projectId: PROJECT_ID,
      issueId: ISSUE_ID,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      accumulatedMinutes: 0,
      pausedAt: null,
      progressStartedAt: null,
      session: { startedAt: new Date("2026-01-01T09:00:00Z") },
      ...overrides,
    });
  }

  it("descarta sesiones por debajo del mínimo facturable (no suma horas)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:05:00Z")); // 5 min corridos
    mockTimer();
    prismaMock.timeEntry.findFirst.mockResolvedValue(null);
    prismaMock.workSession.update.mockResolvedValue({});
    prismaMock.runningTimer.delete.mockResolvedValue({});

    const result = await stopTimer(USER_ID);

    expect(result?.discarded).toBe(true);
    expect(result?.countedMinutes).toBe(0);
    expect(prismaMock.timeEntry.create).not.toHaveBeenCalled();
    expect(prismaMock.workSession.update).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: expect.objectContaining({ discarded: true }),
    });
  });

  it("imputa horas cuando la sesión supera el mínimo facturable", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:15:00Z")); // 15 min corridos
    mockTimer();
    prismaMock.timeEntry.findFirst.mockResolvedValue(null);
    prismaMock.workSession.update.mockResolvedValue({});
    prismaMock.runningTimer.delete.mockResolvedValue({});

    const result = await stopTimer(USER_ID);

    expect(result?.discarded).toBe(false);
    expect(result?.countedMinutes).toBe(15);
    expect(prismaMock.timeEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ minutes: 15, issueId: ISSUE_ID }),
    });
  });

  it("no cuenta tiempo corrido si estaba pausado al detenerse", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:30:00Z"));
    mockTimer({
      accumulatedMinutes: 12,
      pausedAt: new Date("2026-01-01T10:10:00Z"),
    });
    prismaMock.timeEntry.findFirst.mockResolvedValue(null);
    prismaMock.workSession.update.mockResolvedValue({});
    prismaMock.runningTimer.delete.mockResolvedValue({});

    const result = await stopTimer(USER_ID);

    // Solo lo acumulado antes de pausar (12 min); el tramo pausado no suma.
    expect(result?.minutes).toBe(12);
  });

  it("devuelve null si no hay temporizador activo", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue(null);
    const result = await stopTimer(USER_ID);
    expect(result).toBeNull();
    expect(prismaMock.runningTimer.delete).not.toHaveBeenCalled();
  });
});

describe("getRunningTimer — limpieza de temporizadores huérfanos", () => {
  function mockRunningTimer(
    sessionStartedAt: Date,
    overrides: Record<string, unknown> = {},
  ) {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      sessionId: SESSION_ID,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      accumulatedMinutes: 30,
      pausedAt: null,
      progressStartedAt: null,
      session: { startedAt: sessionStartedAt },
      project: {
        id: PROJECT_ID,
        name: "Proyecto",
        workspaceId: WORKSPACE_ID,
        progressTimerPolicy: ProgressTimerPolicy.PAUSE,
      },
      issue: {
        id: ISSUE_ID,
        number: 1,
        title: "Tarea",
        progressTimerPolicy: null,
      },
      ...overrides,
    });
  }

  it("devuelve el temporizador normalmente si no está huérfano", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T11:00:00Z")); // 1h, dentro del umbral
    mockRunningTimer(new Date("2026-01-01T10:00:00Z"));

    const result = await getRunningTimer(USER_ID);

    expect(result?.sessionId).toBe(SESSION_ID);
    expect(prismaMock.runningTimer.delete).not.toHaveBeenCalled();
  });

  it("cierra solo un temporizador que lleva corriendo más del umbral (huérfano) y limita lo imputado", async () => {
    vi.useFakeTimers();
    // La sesión arrancó hace 3 días: se cerró el navegador y nunca se detuvo.
    vi.setSystemTime(new Date("2026-01-04T10:00:00Z"));
    mockRunningTimer(new Date("2026-01-01T10:00:00Z"), {
      accumulatedMinutes: 30,
      pausedAt: null,
    });
    prismaMock.timeEntry.findFirst.mockResolvedValue(null);
    prismaMock.workSession.update.mockResolvedValue({});
    prismaMock.runningTimer.delete.mockResolvedValue({});

    const result = await getRunningTimer(USER_ID);

    expect(result).toBeNull();
    expect(prismaMock.runningTimer.delete).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
    // 720 = tope de 12h, muy por debajo de los ~3 días reales corridos.
    expect(prismaMock.workSession.update).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: expect.objectContaining({ minutes: 720, discarded: false }),
    });
  });
});

describe("cancelTimer", () => {
  it("borra la sesión completa (arrastra el temporizador por cascada)", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
    await cancelTimer(USER_ID);
    expect(prismaMock.workSession.delete).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
    });
  });

  it("es un no-op si no hay temporizador activo", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue(null);
    await cancelTimer(USER_ID);
    expect(prismaMock.workSession.delete).not.toHaveBeenCalled();
  });
});

describe("beginTimerProgress / endTimerProgress", () => {
  it("beginTimerProgress congela el tramo corrido y marca el inicio de documentación", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:04:00Z"));
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      projectId: PROJECT_ID,
      issueId: ISSUE_ID,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      accumulatedMinutes: 0,
      pausedAt: null,
      progressStartedAt: null,
    });
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({
      progressTimerPolicy: ProgressTimerPolicy.HALF,
    });
    prismaMock.issue.findUniqueOrThrow.mockResolvedValue({
      progressTimerPolicy: null,
    });

    const policy = await beginTimerProgress(USER_ID);

    expect(policy).toBe(ProgressTimerPolicy.HALF);
    expect(prismaMock.runningTimer.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({ accumulatedMinutes: 4 }),
    });
  });

  it("endTimerProgress con política HALF acredita la mitad del tiempo documentado", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:10:00Z")); // 10 min documentando
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      projectId: PROJECT_ID,
      issueId: ISSUE_ID,
      accumulatedMinutes: 4,
      progressStartedAt: new Date("2026-01-01T10:00:00Z"),
    });
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({
      progressTimerPolicy: ProgressTimerPolicy.HALF,
    });
    prismaMock.issue.findUniqueOrThrow.mockResolvedValue({
      progressTimerPolicy: null,
    });

    const result = await endTimerProgress(USER_ID);

    expect(result).toEqual({ policy: ProgressTimerPolicy.HALF, credited: 5 });
    expect(prismaMock.runningTimer.update).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({
        accumulatedMinutes: 9, // 4 acumulados + 5 acreditados
        progressStartedAt: null,
      }),
    });
  });

  it("endTimerProgress con política PAUSE no acredita nada", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:10:00Z"));
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      projectId: PROJECT_ID,
      issueId: ISSUE_ID,
      accumulatedMinutes: 4,
      progressStartedAt: new Date("2026-01-01T10:00:00Z"),
    });
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({
      progressTimerPolicy: ProgressTimerPolicy.PAUSE,
    });
    prismaMock.issue.findUniqueOrThrow.mockResolvedValue({
      progressTimerPolicy: null,
    });

    const result = await endTimerProgress(USER_ID);

    expect(result).toEqual({ policy: ProgressTimerPolicy.PAUSE, credited: 0 });
  });

  it("endTimerProgress es un no-op si no estaba documentando", async () => {
    prismaMock.runningTimer.findUnique.mockResolvedValue({
      userId: USER_ID,
      progressStartedAt: null,
    });
    const result = await endTimerProgress(USER_ID);
    expect(result).toBeUndefined();
    expect(prismaMock.runningTimer.update).not.toHaveBeenCalled();
  });
});
