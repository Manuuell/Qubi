import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  meeting: { findUnique: vi.fn() },
  meetingCalendarEvent: {
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

const { syncMeetingToGoogleCalendars } =
  await import("./google-calendar-meeting-sync");

const BASE = "https://qubi.example";

function meeting(over: Record<string, unknown> = {}) {
  return {
    id: "meeting-1",
    workspaceId: "ws-1",
    title: "Retro de sprint",
    description: "Repaso del sprint 12",
    location: "Sala 2",
    startAt: new Date("2026-08-20T14:00:00.000Z"),
    endAt: new Date("2026-08-20T15:00:00.000Z"),
    cancelledAt: null,
    attendees: [{ userId: "ana" }],
    googleEvents: [],
    ...over,
  };
}

// Respuestas de la API de Google. Se registran las llamadas para poder
// afirmar QUE se hizo (crear/actualizar/borrar) y sobre qué evento.
function mockGoogle(responses: { status: number; body?: unknown }[]) {
  const spy = vi.spyOn(globalThis, "fetch");
  for (const r of responses) {
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

describe("syncMeetingToGoogleCalendars", () => {
  it("crea el evento con hora (no de día completo) y guarda su id", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(meeting());
    const spy = mockGoogle([{ status: 200, body: { id: "evento-google-1" } }]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    const [llamada] = calls(spy);
    expect(llamada.method).toBe("POST");
    expect(llamada.body.summary).toBe("Retro de sprint");
    expect(llamada.body.location).toBe("Sala 2");
    expect(llamada.body.start).toEqual({
      dateTime: "2026-08-20T14:00:00.000Z",
      timeZone: "America/Bogota",
    });
    expect(llamada.body.end).toEqual({
      dateTime: "2026-08-20T15:00:00.000Z",
      timeZone: "America/Bogota",
    });
    expect(llamada.body.description).toContain(`${BASE}/w/ws-1/agenda`);
    expect(prismaMock.meetingCalendarEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          meetingId: "meeting-1",
          userId: "ana",
          eventId: "evento-google-1",
        },
      }),
    );
  });

  it("actualiza el evento existente en vez de crear otro", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(
      meeting({ googleEvents: [{ userId: "ana", eventId: "evento-1" }] }),
    );
    const spy = mockGoogle([{ status: 200, body: { id: "evento-1" } }]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    const [llamada] = calls(spy);
    expect(llamada.method).toBe("PATCH");
    expect(llamada.url).toContain("/evento-1");
    expect(prismaMock.meetingCalendarEvent.upsert).not.toHaveBeenCalled();
  });

  it("borra el evento cuando la reunión se cancela", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(
      meeting({
        cancelledAt: new Date("2026-08-19T00:00:00.000Z"),
        googleEvents: [{ userId: "ana", eventId: "evento-1" }],
      }),
    );
    const spy = mockGoogle([{ status: 204 }]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    expect(calls(spy)[0].method).toBe("DELETE");
    expect(prismaMock.meetingCalendarEvent.deleteMany).toHaveBeenCalled();
  });

  it("al quitar a alguien de invitados, le borra el evento", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(
      meeting({
        attendees: [{ userId: "beto" }],
        googleEvents: [{ userId: "ana", eventId: "evento-de-ana" }],
      }),
    );
    const spy = mockGoogle([
      { status: 204 },
      { status: 200, body: { id: "evento-de-beto" } },
    ]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    const hechas = calls(spy);
    expect(hechas[0].method).toBe("DELETE");
    expect(hechas[0].url).toContain("evento-de-ana");
    expect(hechas[1].method).toBe("POST");
  });

  it("pone un evento en el calendario de cada invitado", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(
      meeting({ attendees: [{ userId: "ana" }, { userId: "beto" }] }),
    );
    const spy = mockGoogle([
      { status: 200, body: { id: "e1" } },
      { status: 200, body: { id: "e2" } },
    ]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    expect(calls(spy).filter((c) => c.method === "POST")).toHaveLength(2);
  });

  it("ignora a quien no ha conectado su calendario", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(meeting());
    getAccessToken.mockResolvedValue(null);
    const spy = mockGoogle([]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    expect(spy).not.toHaveBeenCalled();
    expect(prismaMock.meetingCalendarEvent.upsert).not.toHaveBeenCalled();
  });

  it("recrea el evento si alguien lo borro a mano en Google", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(
      meeting({
        googleEvents: [{ userId: "ana", eventId: "evento-fantasma" }],
      }),
    );
    const spy = mockGoogle([
      { status: 404 }, // el PATCH no encuentra el evento
      { status: 200, body: { id: "evento-nuevo" } },
    ]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    const hechas = calls(spy);
    expect(hechas[0].method).toBe("PATCH");
    expect(hechas[1].method).toBe("POST");
    expect(prismaMock.meetingCalendarEvent.upsert).toHaveBeenCalled();
  });

  it("no hace nada si la reunión ya no existe", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(null);
    const spy = mockGoogle([]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    expect(spy).not.toHaveBeenCalled();
  });

  it("una reunión sin lugar no manda 'location' vacío", async () => {
    prismaMock.meeting.findUnique.mockResolvedValue(meeting({ location: "" }));
    const spy = mockGoogle([{ status: 200, body: { id: "e1" } }]);

    await syncMeetingToGoogleCalendars("meeting-1", BASE);

    const [llamada] = calls(spy);
    expect(llamada.body.location).toBeUndefined();
  });
});
