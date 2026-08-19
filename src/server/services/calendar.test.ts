import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueStatus, ProjectStatus } from "@/generated/prisma/enums";

// El módulo ICS puro ya tiene sus tests (lib/ics.test.ts). Aquí se cubre lo
// otro: qué tareas entran en el feed y cómo se convierten en eventos.

const prismaMock = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  issue: { findMany: vi.fn() },
};
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  buildCalendarFeed,
  calendarFeedUrl,
  getOrCreateCalendarToken,
  regenerateCalendarToken,
} = await import("./calendar");

const BASE = "https://qubi.example";

function task(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "task-1",
    number: 7,
    title: "Preparar la demo",
    workspaceId: "ws-1",
    startDate: null,
    dueDate: new Date(2026, 7, 20), // 20/08/2026 en horario local
    updatedAt: new Date("2026-08-19T08:00:00Z"),
    project: { name: "Implantación" },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calendarFeedUrl", () => {
  it("cuelga el token de la ruta del feed", () => {
    expect(calendarFeedUrl(BASE, "abc")).toBe(`${BASE}/api/calendar/abc`);
  });
});

describe("getOrCreateCalendarToken", () => {
  it("reutiliza el token existente sin escribir en la BD", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      calendarToken: "ya-existe",
    });

    expect(await getOrCreateCalendarToken("user-1")).toBe("ya-existe");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("crea uno largo e impredecible si no hay", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ calendarToken: null });

    const token = await getOrCreateCalendarToken("user-1");

    expect(token).toMatch(/^[\w-]{40,}$/); // 32 bytes en base64url
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { calendarToken: token },
    });
  });
});

describe("regenerateCalendarToken", () => {
  it("siempre emite uno distinto, aunque ya hubiera", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ calendarToken: "viejo" });

    const a = await regenerateCalendarToken("user-1");
    const b = await regenerateCalendarToken("user-1");

    expect(a).not.toBe("viejo");
    expect(a).not.toBe(b);
  });
});

describe("buildCalendarFeed", () => {
  it("solo pide tareas vivas, con fecha, asignadas y de proyectos activos", async () => {
    prismaMock.issue.findMany.mockResolvedValue([]);

    await buildCalendarFeed("user-1", BASE, "Ana");

    const where = prismaMock.issue.findMany.mock.calls[0][0].where;
    expect(where.assignees).toEqual({ some: { userId: "user-1" } });
    expect(where.workspace).toEqual({
      members: { some: { userId: "user-1" } },
    });
    expect(where.status).toEqual({ not: IssueStatus.DONE });
    expect(where.project).toEqual({ status: ProjectStatus.ACTIVE });
    expect(where.OR).toEqual([
      { dueDate: { not: null } },
      { startDate: { not: null } },
    ]);
  });

  it("una tarea con solo fecha límite ocupa ese día", async () => {
    prismaMock.issue.findMany.mockResolvedValue([task()]);

    const feed = await buildCalendarFeed("user-1", BASE, "Ana");

    expect(feed).toContain("DTSTART;VALUE=DATE:20260820");
    expect(feed).toContain("DTEND;VALUE=DATE:20260821"); // fin exclusivo
  });

  it("con inicio y fin ocupa el rango completo", async () => {
    prismaMock.issue.findMany.mockResolvedValue([
      task({
        startDate: new Date(2026, 7, 18),
        dueDate: new Date(2026, 7, 20),
      }),
    ]);

    const feed = await buildCalendarFeed("user-1", BASE, "Ana");

    expect(feed).toContain("DTSTART;VALUE=DATE:20260818");
    expect(feed).toContain("DTEND;VALUE=DATE:20260821");
  });

  it("aguanta fechas invertidas dando al menos un día", async () => {
    prismaMock.issue.findMany.mockResolvedValue([
      task({
        startDate: new Date(2026, 7, 25),
        dueDate: new Date(2026, 7, 20),
      }),
    ]);

    const feed = await buildCalendarFeed("user-1", BASE, "Ana");

    expect(feed).toContain("DTSTART;VALUE=DATE:20260825");
    expect(feed).toContain("DTEND;VALUE=DATE:20260826");
  });

  it("usa un UID estable por tarea para que Google actualice, no duplique", async () => {
    prismaMock.issue.findMany.mockResolvedValue([task()]);

    const primera = await buildCalendarFeed("user-1", BASE, "Ana");
    prismaMock.issue.findMany.mockResolvedValue([
      task({ title: "Otro título" }),
    ]);
    const segunda = await buildCalendarFeed("user-1", BASE, "Ana");

    expect(primera).toContain("UID:task-1@qubi");
    expect(segunda).toContain("UID:task-1@qubi");
  });

  it("enlaza a la tarea y nombra el proyecto en la descripción", async () => {
    prismaMock.issue.findMany.mockResolvedValue([task()]);

    const feed = await buildCalendarFeed("user-1", BASE, "Ana");

    expect(feed.replaceAll("\r\n ", "")).toContain(
      `DESCRIPTION:Proyecto: Implantación\\n${BASE}/w/ws-1/tasks/7`,
    );
  });

  it("descarta tareas sin proyecto en vez de reventar", async () => {
    prismaMock.issue.findMany.mockResolvedValue([task({ project: null })]);

    const feed = await buildCalendarFeed("user-1", BASE, "Ana");

    expect(feed).not.toContain("BEGIN:VEVENT");
    expect(feed).toContain("END:VCALENDAR");
  });

  it("cae a un nombre generico si el usuario no tiene nombre", async () => {
    prismaMock.issue.findMany.mockResolvedValue([]);

    expect(await buildCalendarFeed("user-1", BASE, null)).toContain(
      "X-WR-CALNAME:Qubi",
    );
  });
});
