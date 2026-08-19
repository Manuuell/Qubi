import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  googleCalendarLink: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
};
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  buildConnectUrl,
  completeConnection,
  disconnect,
  getAccessToken,
  googleCalendarConfigured,
} = await import("./google-calendar");
const { seal } = await import("@/lib/secret-box");

const BASE = "https://qubi.example";

// Construye un id_token de mentira: Google lo manda firmado, pero el servicio
// solo lee el email del payload (ya vino por TLS desde su endpoint).
function idToken(email: string) {
  const payload = Buffer.from(JSON.stringify({ email })).toString("base64url");
  return `cabecera.${payload}.firma`;
}

function mockFetchOnce(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = "secreto-de-prueba";
  process.env.AUTH_GOOGLE_ID = "cliente-de-prueba";
  process.env.AUTH_GOOGLE_SECRET = "secreto-cliente";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("googleCalendarConfigured", () => {
  it("depende de que haya credenciales de Google", () => {
    expect(googleCalendarConfigured()).toBe(true);

    delete process.env.AUTH_GOOGLE_ID;
    expect(googleCalendarConfigured()).toBe(false);
  });
});

describe("buildConnectUrl", () => {
  const params = () =>
    new URL(buildConnectUrl(BASE, "estado-123")).searchParams;

  it("pide el permiso de eventos, no acceso total al calendario", () => {
    const scope = params().get("scope") ?? "";

    expect(scope).toContain("https://www.googleapis.com/auth/calendar.events");
    expect(scope).not.toContain("auth/calendar ");
  });

  it("pide acceso sin conexion para poder sincronizar despues", () => {
    // Sin access_type=offline no llega refresh token y el permiso moriria en
    // una hora; sin prompt=consent Google lo omite si ya autorizo antes.
    expect(params().get("access_type")).toBe("offline");
    expect(params().get("prompt")).toBe("consent");
  });

  it("lleva el state y la vuelta a nuestro callback", () => {
    expect(params().get("state")).toBe("estado-123");
    expect(params().get("redirect_uri")).toBe(
      `${BASE}/api/google-calendar/callback`,
    );
  });
});

describe("completeConnection", () => {
  it("guarda el refresh token cifrado, nunca en claro", async () => {
    mockFetchOnce({
      refresh_token: "1//token-secreto",
      access_token: "ya29.acceso",
      id_token: idToken("ana@gmail.com"),
    });

    const result = await completeConnection("user-1", "codigo", BASE);

    expect(result.ok).toBe(true);
    const guardado = prismaMock.googleCalendarLink.upsert.mock.calls[0][0];
    expect(guardado.create.encryptedRefreshToken).not.toContain(
      "1//token-secreto",
    );
    expect(guardado.create.googleEmail).toBe("ana@gmail.com");
  });

  it("no guarda nada si Google no devuelve refresh token", async () => {
    // Pasa cuando ya se autorizo antes y no se fuerza el consentimiento: sin
    // refresh, la conexion moriria en una hora, asi que mejor no fingir.
    mockFetchOnce({ access_token: "ya29.acceso" });

    const result = await completeConnection("user-1", "codigo", BASE);

    expect(result.ok).toBe(false);
    expect(prismaMock.googleCalendarLink.upsert).not.toHaveBeenCalled();
  });

  it("no guarda nada si Google responde con error", async () => {
    mockFetchOnce({ error: "invalid_grant", error_description: "caducado" });

    await expect(completeConnection("user-1", "malo", BASE)).resolves.toEqual({
      ok: false,
      reason: "caducado",
    });
    expect(prismaMock.googleCalendarLink.upsert).not.toHaveBeenCalled();
  });
});

describe("getAccessToken", () => {
  it("canjea el refresh guardado por un token fresco", async () => {
    prismaMock.googleCalendarLink.findUnique.mockResolvedValue({
      encryptedRefreshToken: seal("1//token-secreto"),
    });
    const fetchSpy = mockFetchOnce({ access_token: "ya29.fresco" });

    expect(await getAccessToken("user-1")).toBe("ya29.fresco");
    const enviado = fetchSpy.mock.calls[0][1]?.body as URLSearchParams;
    expect(enviado.get("refresh_token")).toBe("1//token-secreto");
    expect(enviado.get("grant_type")).toBe("refresh_token");
  });

  it("devuelve null si la persona no ha conectado", async () => {
    prismaMock.googleCalendarLink.findUnique.mockResolvedValue(null);

    expect(await getAccessToken("user-1")).toBeNull();
  });

  it("devuelve null si el dato guardado ya no se puede descifrar", async () => {
    prismaMock.googleCalendarLink.findUnique.mockResolvedValue({
      encryptedRefreshToken: "basura.que.no.descifra",
    });

    expect(await getAccessToken("user-1")).toBeNull();
  });

  it("retira la conexion si revocaron el permiso desde Google", async () => {
    prismaMock.googleCalendarLink.findUnique.mockResolvedValue({
      encryptedRefreshToken: seal("1//token-revocado"),
    });
    mockFetchOnce({ error: "invalid_grant" });

    expect(await getAccessToken("user-1")).toBeNull();
    expect(prismaMock.googleCalendarLink.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});

describe("disconnect", () => {
  it("revoca en Google y borra la conexion", async () => {
    prismaMock.googleCalendarLink.findUnique.mockResolvedValue({
      encryptedRefreshToken: seal("1//token"),
    });
    const fetchSpy = mockFetchOnce({});

    await disconnect("user-1");

    expect(fetchSpy.mock.calls[0][0]).toContain("revoke");
    expect(prismaMock.googleCalendarLink.deleteMany).toHaveBeenCalled();
  });

  it("borra la conexion aunque Google falle al revocar", async () => {
    prismaMock.googleCalendarLink.findUnique.mockResolvedValue({
      encryptedRefreshToken: seal("1//token"),
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("red caida"));

    await disconnect("user-1");

    expect(prismaMock.googleCalendarLink.deleteMany).toHaveBeenCalled();
  });
});
