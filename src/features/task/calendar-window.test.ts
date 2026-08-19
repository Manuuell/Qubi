import { describe, expect, it } from "vitest";
import { taskCalendarWindow } from "./calendar-window";

// Esta regla la comparten el feed ICS y la sincronización con Google: si se
// tocara solo en un sitio, la misma tarea caería en días distintos.
describe("taskCalendarWindow", () => {
  it("una tarea con solo fecha límite ocupa ese día", () => {
    expect(
      taskCalendarWindow({ startDate: null, dueDate: new Date(2026, 7, 20) }),
    ).toEqual({ startKey: "2026-08-20", endKey: "2026-08-21" });
  });

  it("una tarea con solo fecha de inicio ocupa ese día", () => {
    expect(
      taskCalendarWindow({ startDate: new Date(2026, 7, 18), dueDate: null }),
    ).toEqual({ startKey: "2026-08-18", endKey: "2026-08-19" });
  });

  it("con inicio y fin ocupa el rango, con el fin exclusivo", () => {
    expect(
      taskCalendarWindow({
        startDate: new Date(2026, 7, 18),
        dueDate: new Date(2026, 7, 20),
      }),
    ).toEqual({ startKey: "2026-08-18", endKey: "2026-08-21" });
  });

  it("da al menos un día si las fechas vienen invertidas", () => {
    expect(
      taskCalendarWindow({
        startDate: new Date(2026, 7, 25),
        dueDate: new Date(2026, 7, 20),
      }),
    ).toEqual({ startKey: "2026-08-25", endKey: "2026-08-26" });
  });

  it("sin ninguna fecha no hay dónde ponerla", () => {
    expect(taskCalendarWindow({ startDate: null, dueDate: null })).toBeNull();
  });
});
