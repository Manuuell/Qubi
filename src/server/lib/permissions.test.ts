import { describe, expect, it, vi } from "vitest";
import { WorkspaceRole } from "@/generated/prisma/enums";

const prismaMock = { workspaceMember: { findUnique: vi.fn() } };
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { assertCanEditTimeManually, isAdminRole } =
  await import("./permissions");

describe("isAdminRole", () => {
  it("OWNER y ADMIN son admin", () => {
    expect(isAdminRole(WorkspaceRole.OWNER)).toBe(true);
    expect(isAdminRole(WorkspaceRole.ADMIN)).toBe(true);
  });

  it("MEMBER y GUEST no son admin", () => {
    expect(isAdminRole(WorkspaceRole.MEMBER)).toBe(false);
    expect(isAdminRole(WorkspaceRole.GUEST)).toBe(false);
  });

  it("null (no es miembro) no es admin", () => {
    expect(isAdminRole(null)).toBe(false);
  });
});

describe("assertCanEditTimeManually", () => {
  // Escribir horas a mano se decide por el rol en el espacio. Antes dependía de
  // una lista de correos con tres direcciones personales por defecto, así que
  // cualquiera que autoalojara Qubi se las regalaba a tres desconocidos.
  const call = () => assertCanEditTimeManually("ws-1", "user-1");

  it("deja pasar a OWNER y ADMIN", async () => {
    for (const role of [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]) {
      prismaMock.workspaceMember.findUnique.mockResolvedValue({ role });
      await expect(call()).resolves.toBeUndefined();
    }
  });

  it("corta a MEMBER y GUEST", async () => {
    for (const role of [WorkspaceRole.MEMBER, WorkspaceRole.GUEST]) {
      prismaMock.workspaceMember.findUnique.mockResolvedValue({ role });
      await expect(call()).rejects.toThrow(/editar horas manualmente/);
    }
  });

  it("corta a quien no es miembro del espacio", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
    await expect(call()).rejects.toThrow(/editar horas manualmente/);
  });
});
