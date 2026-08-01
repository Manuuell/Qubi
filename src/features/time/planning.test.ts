import { describe, expect, it } from "vitest";
import { isWeekendKey, plannedDayKeys, plannedMinutesPerDay } from "./planning";

// 2026-08-03 es lunes; 2026-08-08 sábado y 2026-08-09 domingo.
const LUNES = "2026-08-03";
const local = (key: string) => new Date(`${key}T00:00:00`);

describe("plannedDayKeys", () => {
  it("sin fecha límite no hay nada que planificar", () => {
    expect(
      plannedDayKeys(
        {
          id: "1",
          startDate: local(LUNES),
          dueDate: null,
          estimateMinutes: 60,
        },
        LUNES,
      ),
    ).toEqual([]);
  });

  it("reparte de inicio a fin, ambos incluidos", () => {
    expect(
      plannedDayKeys(
        {
          id: "1",
          startDate: local(LUNES),
          dueDate: local("2026-08-05"),
          estimateMinutes: 180,
        },
        LUNES,
      ),
    ).toEqual(["2026-08-03", "2026-08-04", "2026-08-05"]);
  });

  it("salta los fines de semana", () => {
    const days = plannedDayKeys(
      {
        id: "1",
        startDate: local("2026-08-07"),
        dueDate: local("2026-08-10"),
        estimateMinutes: 120,
      },
      LUNES,
    );
    expect(days).toEqual(["2026-08-07", "2026-08-10"]);
    expect(days.every((d) => !isWeekendKey(d))).toBe(true);
  });

  it("una tarea que ya debió empezar se planifica desde hoy", () => {
    expect(
      plannedDayKeys(
        {
          id: "1",
          startDate: local("2026-07-27"),
          dueDate: local("2026-08-04"),
          estimateMinutes: 120,
        },
        LUNES,
      ),
    ).toEqual(["2026-08-03", "2026-08-04"]);
  });

  it("sin fecha de inicio arranca hoy", () => {
    expect(
      plannedDayKeys(
        {
          id: "1",
          startDate: null,
          dueDate: local("2026-08-04"),
          estimateMinutes: 60,
        },
        LUNES,
      ),
    ).toEqual(["2026-08-03", "2026-08-04"]);
  });

  it("una fecha límite ya pasada no ocupa días futuros", () => {
    expect(
      plannedDayKeys(
        {
          id: "1",
          startDate: local("2026-07-20"),
          dueDate: local("2026-07-30"),
          estimateMinutes: 300,
        },
        LUNES,
      ),
    ).toEqual([]);
  });
});

describe("plannedMinutesPerDay", () => {
  it("parte la estimación entre los días de trabajo", () => {
    const { days, minutesPerDay } = plannedMinutesPerDay(
      {
        id: "1",
        startDate: local(LUNES),
        dueDate: local("2026-08-05"),
        estimateMinutes: 360,
      },
      LUNES,
    );
    expect(days).toHaveLength(3);
    expect(minutesPerDay).toBe(120);
  });

  it("sin estimación no se inventa carga", () => {
    const { days, minutesPerDay } = plannedMinutesPerDay(
      {
        id: "1",
        startDate: local(LUNES),
        dueDate: local("2026-08-05"),
        estimateMinutes: null,
      },
      LUNES,
    );
    expect(days).toHaveLength(3);
    expect(minutesPerDay).toBe(0);
  });
});
