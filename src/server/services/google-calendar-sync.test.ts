import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { IssueStatus, ProjectStatus } from "@/generated/prisma/enums";

const prismaMock = {
  issue: { findUnique: vi.fn() },
  googleCalendarEvent: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const getAccessToken = vi.fn();
vi.mock("@/server/services/google-calendar", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/services/google-calendar")>();
  return { ...actual, getAccessToken };
});

const { syncTaskToGoogleCalendars, listTaskEvents, removeDeletedTaskEvents } =
  await import("./google-calendar-sync");

const BASE = "https://qubi.example";

function task(over: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    number: 42,
    title: "Preparar la demo",
    workspaceId: "ws-1",
    status: IssueStatus.TODO,
    startDate: null,
    dueDate: new Date(2026, 7, 20),
    project: { name: "Implantación", status: ProjectStatus.ACTIVE },
    assignees: [{ userId: "ana" }],
    googleEvents: [],
    ...over,
  };
}

// Respuestas de la API de Google. Se registran las llamadas para poder
// afirmar QUE se hizo (crear/actualizar/borrar) y sobre qué evento.
function mockGoogle(responses: { status: number; body?: unknown }[]) {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const r of responses) {
    // 204/205/304 no admiten cuerpo: el constructor de Response lo rechaza.
    const sinCuerpo = [204, 205, 304].includes(r.status);
    spy.mockResolvedValueOnce(
      new Response(sinCuerpo ? null : JSON.stringify(r.body ?? {}), {
        status: r.status,
      }),
    );
  }
  return spy;
}

function calls(spy: ReturnType<typeof mockGoogle>) {
  return spy.mock.calls.map(([url, init]) => ({
    url: String(url),
    method: (init as RequestInit | undefined)?.method,
    body: (init as RequestInit | undefined)?.body
      ? JSON.parse(String((init as RequestInit).body))
      : undefined,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue("ya29.token");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncTaskToGoogleCalendars", () => {
  it("crea el evento y guarda su id para poder actualizarlo despues", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(task());
    const spy = mockGoogle([{ status: 200, body: { id: "evento-google-1" } }]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    const [llamada] = calls(spy);
    expect(llamada.method).toBe("POST");
    expect(llamada.body.summary).toBe("Preparar la demo");
    expect(llamada.body.start).toEqual({ date: "2026-08-20" });
    expect(llamada.body.end).toEqual({ date: "2026-08-21" }); // fin exclusivo
    expect(llamada.body.description).toContain(`${BASE}/w/ws-1/tasks/42`);
    expect(prismaMock.googleCalendarEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          issueId: "task-1",
          userId: "ana",
          eventId: "evento-google-1",
        },
      }),
    );
  });

  it("actualiza el evento existente en vez de crear otro", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({ googleEvents: [{ userId: "ana", eventId: "evento-1" }] }),
    );
    const spy = mockGoogle([{ status: 200, body: { id: "evento-1" } }]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    const [llamada] = calls(spy);
    expect(llamada.method).toBe("PATCH");
    expect(llamada.url).toContain("/evento-1");
    expect(prismaMock.googleCalendarEvent.upsert).not.toHaveBeenCalled();
  });

  it("borra el evento cuando la tarea se marca como hecha", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({
        status: IssueStatus.DONE,
        googleEvents: [{ userId: "ana", eventId: "evento-1" }],
      }),
    );
    const spy = mockGoogle([{ status: 204 }]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(calls(spy)[0].method).toBe("DELETE");
    expect(prismaMock.googleCalendarEvent.deleteMany).toHaveBeenCalled();
  });

  it("borra el evento si le quitan todas las fechas", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({
        startDate: null,
        dueDate: null,
        googleEvents: [{ userId: "ana", eventId: "evento-1" }],
      }),
    );
    const spy = mockGoogle([{ status: 204 }]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(calls(spy)[0].method).toBe("DELETE");
  });

  it("borra el evento si archivan el proyecto", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({
        project: { name: "Implantación", status: ProjectStatus.ARCHIVED },
        googleEvents: [{ userId: "ana", eventId: "evento-1" }],
      }),
    );
    const spy = mockGoogle([{ status: 204 }]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(calls(spy)[0].method).toBe("DELETE");
  });

  it("al reasignar, quita el evento del anterior y lo pone al nuevo", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({
        assignees: [{ userId: "beto" }],
        googleEvents: [{ userId: "ana", eventId: "evento-de-ana" }],
      }),
    );
    const spy = mockGoogle([
      { status: 204 },
      { status: 200, body: { id: "evento-de-beto" } },
    ]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    const hechas = calls(spy);
    expect(hechas[0].method).toBe("DELETE");
    expect(hechas[0].url).toContain("evento-de-ana");
    expect(hechas[1].method).toBe("POST");
  });

  it("pone un evento en el calendario de cada responsable", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({ assignees: [{ userId: "ana" }, { userId: "beto" }] }),
    );
    const spy = mockGoogle([
      { status: 200, body: { id: "e1" } },
      { status: 200, body: { id: "e2" } },
    ]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(calls(spy).filter((c) => c.method === "POST")).toHaveLength(2);
  });

  it("ignora a quien no ha conectado su calendario", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(task());
    getAccessToken.mockResolvedValue(null);
    const spy = mockGoogle([]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(spy).not.toHaveBeenCalled();
    expect(prismaMock.googleCalendarEvent.upsert).not.toHaveBeenCalled();
  });

  it("recrea el evento si alguien lo borro a mano en Google", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(
      task({ googleEvents: [{ userId: "ana", eventId: "evento-fantasma" }] }),
    );
    const spy = mockGoogle([
      { status: 404 }, // el PATCH no encuentra el evento
      { status: 200, body: { id: "evento-nuevo" } },
    ]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    const hechas = calls(spy);
    expect(hechas[0].method).toBe("PATCH");
    expect(hechas[1].method).toBe("POST");
    expect(prismaMock.googleCalendarEvent.upsert).toHaveBeenCalled();
  });

  it("no hace nada si la tarea ya no existe", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(null);
    const spy = mockGoogle([]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(spy).not.toHaveBeenCalled();
  });

  it("una tarea sin proyecto no llega al calendario", async () => {
    prismaMock.issue.findUnique.mockResolvedValue(task({ project: null }));
    const spy = mockGoogle([]);

    await syncTaskToGoogleCalendars("task-1", BASE);

    expect(spy).not.toHaveBeenCalled();
  });
});

describe("borrado de tareas", () => {
  it("listTaskEvents fotografia los eventos antes de que caigan en cascada", async () => {
    prismaMock.googleCalendarEvent.findMany.mockResolvedValue([
      { userId: "ana", eventId: "evento-1" },
    ]);

    expect(await listTaskEvents("task-1")).toEqual([
      { userId: "ana", eventId: "evento-1" },
    ]);
  });

  it("removeDeletedTaskEvents los quita del calendario de cada persona", async () => {
    const spy = mockGoogle([{ status: 204 }, { status: 204 }]);

    await removeDeletedTaskEvents([
      { userId: "ana", eventId: "evento-1" },
      { userId: "beto", eventId: "evento-2" },
    ]);

    const hechas = calls(spy);
    expect(hechas).toHaveLength(2);
    expect(hechas.every((c) => c.method === "DELETE")).toBe(true);
  });
});
