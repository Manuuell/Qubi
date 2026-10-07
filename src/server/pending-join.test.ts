import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, string>();
const set = vi.fn((name: string, value: string) => {
  values.set(name, value);
});
const remove = vi.fn((name: string) => {
  values.delete(name);
});
const store = {
  get: vi.fn((name: string) => {
    const value = values.get(name);
    return value === undefined ? undefined : { name, value };
  }),
  set,
  delete: remove,
  has: vi.fn((name: string) => values.has(name)),
};

vi.mock("next/headers", () => ({ cookies: async () => store }));

const { clearPendingJoin, readPendingJoin, setPendingJoin, takePendingJoin } =
  await import("./pending-join");

const TOKEN = randomBytes(32).toString("base64url");

beforeEach(() => {
  values.clear();
  vi.clearAllMocks();
});

describe("pending join", () => {
  it("ignora un token inválido al guardar", async () => {
    await setPendingJoin("malo");

    expect(set).not.toHaveBeenCalled();
    expect(values.size).toBe(0);
  });

  it("guarda una cookie protegida durante una hora", async () => {
    await setPendingJoin(TOKEN);

    expect(set).toHaveBeenCalledWith("qubi.join", TOKEN, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 3600,
    });
  });

  it("read rechaza un valor manipulado sin borrarlo", async () => {
    values.set("qubi.join", "manipulado");

    expect(await readPendingJoin()).toBeNull();
    expect(remove).not.toHaveBeenCalled();
    expect(values.has("qubi.join")).toBe(true);
  });

  it("take entrega el token una vez y lo borra", async () => {
    values.set("qubi.join", TOKEN);

    expect(await takePendingJoin()).toBe(TOKEN);
    expect(values.has("qubi.join")).toBe(false);
    expect(await takePendingJoin()).toBeNull();
  });

  it("take borra también un valor inválido", async () => {
    values.set("qubi.join", "manipulado");

    expect(await takePendingJoin()).toBeNull();
    expect(remove).toHaveBeenCalledWith("qubi.join");
    expect(values.has("qubi.join")).toBe(false);
  });

  it("clear no falla si no existe la cookie", async () => {
    await expect(clearPendingJoin()).resolves.toBeUndefined();
    expect(remove).not.toHaveBeenCalled();
  });
});
