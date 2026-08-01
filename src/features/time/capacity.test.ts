import { describe, expect, it } from "vitest";
import {
  DAILY_CAPACITY_MINUTES,
  WEEKLY_CAPACITY_MINUTES,
  capacityPercent,
  loadLevel,
  overCapacityMinutes,
} from "./capacity";

describe("nivel de carga de un día", () => {
  it("un día sin horas está vacío", () => {
    expect(loadLevel(0)).toBe("empty");
    expect(loadLevel(-30)).toBe("empty");
  });

  it("clasifica según la parte de jornada ocupada", () => {
    expect(loadLevel(60)).toBe("light"); // 1 h de 8
    expect(loadLevel(4 * 60)).toBe("good"); // media jornada
    expect(loadLevel(7.5 * 60)).toBe("full"); // 94 %
    expect(loadLevel(DAILY_CAPACITY_MINUTES)).toBe("full"); // justo al límite
  });

  it("marca sobrecarga solo al pasarse", () => {
    expect(loadLevel(DAILY_CAPACITY_MINUTES + 1)).toBe("over");
    expect(loadLevel(14 * 60)).toBe("over");
  });

  it("acepta una capacidad distinta (media jornada)", () => {
    expect(loadLevel(5 * 60, 4 * 60)).toBe("over");
    expect(loadLevel(2 * 60, 4 * 60)).toBe("good");
  });

  it("con capacidad cero no revienta", () => {
    expect(loadLevel(120, 0)).toBe("empty");
    expect(capacityPercent(120, 0)).toBe(0);
  });
});

describe("exceso sobre la capacidad", () => {
  it("es cero cuando se cabe en la jornada", () => {
    expect(overCapacityMinutes(3 * 60)).toBe(0);
    expect(overCapacityMinutes(DAILY_CAPACITY_MINUTES)).toBe(0);
  });

  it("devuelve los minutos que sobran", () => {
    expect(overCapacityMinutes(DAILY_CAPACITY_MINUTES + 90)).toBe(90);
    expect(overCapacityMinutes(10 * 60)).toBe(2 * 60);
  });
});

describe("porcentaje de la celda", () => {
  it("es proporcional a la jornada", () => {
    expect(capacityPercent(4 * 60)).toBe(50);
    expect(capacityPercent(2 * 60)).toBe(25);
  });

  it("se corta en 100 para que no se salga de la celda", () => {
    expect(capacityPercent(12 * 60)).toBe(100);
  });

  it("la semana son cinco jornadas", () => {
    expect(WEEKLY_CAPACITY_MINUTES).toBe(5 * DAILY_CAPACITY_MINUTES);
    expect(capacityPercent(20 * 60, WEEKLY_CAPACITY_MINUTES)).toBe(50);
  });
});
