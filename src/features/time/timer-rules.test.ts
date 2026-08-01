import { describe, expect, it } from "vitest";
import { ProgressTimerPolicy } from "@/generated/prisma/enums";
import {
  MIN_BILLABLE_MINUTES,
  billableMinutes,
  creditedProgressMinutes,
  effectiveProgressPolicy,
  isBillableSession,
  progressTickRate,
  shortSessionNotice,
} from "./timer-rules";

describe("mínimo de minutos para que una sesión cuente", () => {
  it("descarta las sesiones por debajo del umbral", () => {
    expect(isBillableSession(0)).toBe(false);
    expect(isBillableSession(1)).toBe(false);
    expect(isBillableSession(5)).toBe(false);
    expect(isBillableSession(MIN_BILLABLE_MINUTES - 1)).toBe(false);
  });

  it("cuenta desde el umbral en adelante", () => {
    expect(isBillableSession(MIN_BILLABLE_MINUTES)).toBe(true);
    expect(isBillableSession(45)).toBe(true);
  });

  it("no imputa minutos de una sesión corta", () => {
    expect(billableMinutes(4)).toBe(0);
    expect(billableMinutes(9)).toBe(0);
    expect(billableMinutes(10)).toBe(10);
    expect(billableMinutes(90)).toBe(90);
  });

  it("avisa con el tiempo llevado y en singular/plural", () => {
    expect(shortSessionNotice(1)).toContain("1 minuto.");
    expect(shortSessionNotice(4)).toContain("4 minutos.");
    expect(shortSessionNotice(4)).toContain("no se guarda");
  });
});

describe("política del cronómetro mientras se documenta un avance", () => {
  it("con PAUSE no acredita nada", () => {
    expect(creditedProgressMinutes(12, ProgressTimerPolicy.PAUSE)).toBe(0);
    expect(progressTickRate(ProgressTimerPolicy.PAUSE)).toBe(0);
  });

  it("con HALF acredita la mitad, redondeando hacia abajo", () => {
    expect(creditedProgressMinutes(12, ProgressTimerPolicy.HALF)).toBe(6);
    expect(creditedProgressMinutes(7, ProgressTimerPolicy.HALF)).toBe(3);
    expect(creditedProgressMinutes(1, ProgressTimerPolicy.HALF)).toBe(0);
    expect(progressTickRate(ProgressTimerPolicy.HALF)).toBe(0.5);
  });

  it("ignora tiempos negativos", () => {
    expect(creditedProgressMinutes(-5, ProgressTimerPolicy.HALF)).toBe(0);
  });

  it("la tarea manda sobre el proyecto y si no hereda", () => {
    expect(effectiveProgressPolicy(ProgressTimerPolicy.PAUSE, null)).toBe(
      ProgressTimerPolicy.PAUSE,
    );
    expect(
      effectiveProgressPolicy(
        ProgressTimerPolicy.PAUSE,
        ProgressTimerPolicy.HALF,
      ),
    ).toBe(ProgressTimerPolicy.HALF);
    expect(
      effectiveProgressPolicy(
        ProgressTimerPolicy.HALF,
        ProgressTimerPolicy.PAUSE,
      ),
    ).toBe(ProgressTimerPolicy.PAUSE);
  });
});
