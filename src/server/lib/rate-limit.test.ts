import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta el máximo dentro de la ventana", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { max: 5, windowMs: 60_000 }).ok).toBe(true);
    }
  });

  it("bloquea al superar el máximo", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(key, { max: 3, windowMs: 60_000 });
    }
    const result = checkRateLimit(key, { max: 3, windowMs: 60_000 });
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("distintas claves no se afectan entre sí", () => {
    const keyA = `a:${Math.random()}`;
    const keyB = `b:${Math.random()}`;
    for (let i = 0; i < 3; i++)
      checkRateLimit(keyA, { max: 3, windowMs: 60_000 });
    expect(checkRateLimit(keyA, { max: 3, windowMs: 60_000 }).ok).toBe(false);
    expect(checkRateLimit(keyB, { max: 3, windowMs: 60_000 }).ok).toBe(true);
  });

  it("resetea el contador una vez pasada la ventana", () => {
    const key = `reset:${Math.random()}`;
    checkRateLimit(key, { max: 1, windowMs: 1_000 });
    expect(checkRateLimit(key, { max: 1, windowMs: 1_000 }).ok).toBe(false);

    vi.advanceTimersByTime(1_001);

    expect(checkRateLimit(key, { max: 1, windowMs: 1_000 }).ok).toBe(true);
  });
});
