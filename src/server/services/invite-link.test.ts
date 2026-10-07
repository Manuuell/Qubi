import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InviteStatus,
  NotificationType,
  WorkspaceRole,
} from "@/generated/prisma/enums";
import { isValidJoinToken } from "@/lib/join-token";

const prismaMock = {
  workspace: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  workspaceMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
  },
  workspaceInvite: { updateMany: vi.fn() },
  notification: { createMany: vi.fn() },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const publishToUser = vi.fn();
vi.mock("@/server/lib/event-bus", () => ({ publishToUser }));

const {
  disableInviteLink,
  enableInviteLink,
  findWorkspaceByInviteToken,
  getInviteLinkToken,
  INVALID_LINK_ERROR,
  joinWorkspaceViaLink,
  regenerateInviteLink,
} = await import("./invite-link");

const TOKEN = randomBytes(32).toString("base64url");
const OTHER_TOKEN = randomBytes(32).toString("base64url");
const WORKSPACE = {
  id: "ws-1",
  name: "Diseño",
  icon: "D",
  _count: { members: 3 },
};
const USER = { id: "ana", email: "Ana@X.com", name: "Ana" };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof prismaMock) => Promise<unknown>) =>
      callback(prismaMock),
  );
  prismaMock.workspaceMember.findMany.mockResolvedValue([]);
  prismaMock.notification.createMany.mockResolvedValue({ count: 0 });
  prismaMock.workspaceInvite.updateMany.mockResolvedValue({ count: 0 });
});

describe("gestión administrativa", () => {
  it.each([WorkspaceRole.MEMBER, WorkspaceRole.GUEST, null])(
    "rechaza el rol %s sin escribir",
    async (role) => {
      prismaMock.workspaceMember.findUnique.mockResolvedValue(
        role ? { role } : null,
      );

      await expect(getInviteLinkToken("ws-1", "user-1")).rejects.toThrow(
        "Solo el propietario o los administradores",
      );
      await expect(enableInviteLink("ws-1", "user-1")).rejects.toThrow(
        "Solo el propietario o los administradores",
      );
      await expect(regenerateInviteLink("ws-1", "user-1")).rejects.toThrow(
        "Solo el propietario o los administradores",
      );
      await expect(disableInviteLink("ws-1", "user-1")).rejects.toThrow(
        "Solo el propietario o los administradores",
      );

      expect(prismaMock.workspace.update).not.toHaveBeenCalled();
      expect(prismaMock.workspace.updateMany).not.toHaveBeenCalled();
    },
  );

  it("enable devuelve el token existente sin escribir", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.ADMIN,
    });
    prismaMock.workspace.findUnique.mockResolvedValue({
      inviteLinkToken: TOKEN,
    });

    expect(await enableInviteLink("ws-1", "admin")).toBe(TOKEN);
    expect(prismaMock.workspace.updateMany).not.toHaveBeenCalled();
  });

  it("enable crea un token válido solo si el campo sigue vacío", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prismaMock.workspace.findUnique
      .mockResolvedValueOnce({ inviteLinkToken: null })
      .mockImplementationOnce(async () => ({
        inviteLinkToken:
          prismaMock.workspace.updateMany.mock.calls[0][0].data.inviteLinkToken,
      }));
    prismaMock.workspace.updateMany.mockResolvedValue({ count: 1 });

    const token = await enableInviteLink("ws-1", "owner");

    const input = prismaMock.workspace.updateMany.mock.calls[0][0];
    expect(input.where).toEqual({ id: "ws-1", inviteLinkToken: null });
    expect(isValidJoinToken(input.data.inviteLinkToken)).toBe(true);
    expect(token).toBe(input.data.inviteLinkToken);
  });

  it("en una carrera devuelve el token que guardó el otro admin", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.ADMIN,
    });
    prismaMock.workspace.findUnique
      .mockResolvedValueOnce({ inviteLinkToken: null })
      .mockResolvedValueOnce({ inviteLinkToken: OTHER_TOKEN });
    prismaMock.workspace.updateMany.mockResolvedValue({ count: 0 });

    expect(await enableInviteLink("ws-1", "admin")).toBe(OTHER_TOKEN);
  });

  it("regenera con otro token válido y desactiva con null", async () => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.ADMIN,
    });
    prismaMock.workspace.update.mockResolvedValue({});

    const regenerated = await regenerateInviteLink("ws-1", "admin");
    expect(isValidJoinToken(regenerated)).toBe(true);
    expect(regenerated).not.toBe(TOKEN);
    expect(prismaMock.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws-1" },
      data: { inviteLinkToken: regenerated },
    });

    await disableInviteLink("ws-1", "admin");
    expect(prismaMock.workspace.update).toHaveBeenLastCalledWith({
      where: { id: "ws-1" },
      data: { inviteLinkToken: null },
    });
  });
});

describe("vista previa", () => {
  it("rechaza tokens inválidos antes de consultar Prisma", async () => {
    expect(await findWorkspaceByInviteToken("malo")).toBeNull();
    expect(prismaMock.workspace.findUnique).not.toHaveBeenCalled();
  });

  it("devuelve null si no encuentra el espacio", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(null);

    expect(await findWorkspaceByInviteToken(TOKEN)).toBeNull();
  });

  it("mapea el contador de miembros", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);

    expect(await findWorkspaceByInviteToken(TOKEN)).toEqual({
      id: "ws-1",
      name: "Diseño",
      icon: "D",
      memberCount: 3,
    });
  });
});

describe("unión", () => {
  it("rechaza un token inválido o inexistente sin intentar crear", async () => {
    await expect(joinWorkspaceViaLink("malo", USER)).rejects.toThrow(
      INVALID_LINK_ERROR,
    );
    prismaMock.workspace.findUnique.mockResolvedValue(null);
    await expect(joinWorkspaceViaLink(TOKEN, USER)).rejects.toThrow(
      INVALID_LINK_ERROR,
    );
    expect(prismaMock.workspaceMember.createMany).not.toHaveBeenCalled();
  });

  it("añade como miembro, acepta la invitación y avisa a cada admin", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
    prismaMock.workspaceMember.createMany.mockResolvedValue({ count: 1 });
    prismaMock.workspaceMember.findMany.mockResolvedValue([
      { userId: "owner" },
      { userId: "admin" },
    ]);
    prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

    await expect(joinWorkspaceViaLink(TOKEN, USER)).resolves.toEqual({
      workspaceId: "ws-1",
      joined: true,
    });

    expect(prismaMock.workspaceMember.createMany).toHaveBeenCalledWith({
      data: [
        { workspaceId: "ws-1", userId: "ana", role: WorkspaceRole.MEMBER },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.workspaceInvite.updateMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-1",
        email: "ana@x.com",
        status: InviteStatus.PENDING,
      },
      data: { status: InviteStatus.ACCEPTED, respondedAt: expect.any(Date) },
    });
    expect(prismaMock.workspaceMember.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-1",
        role: { in: [WorkspaceRole.OWNER, WorkspaceRole.ADMIN] },
        userId: { not: "ana" },
      },
      select: { userId: true },
    });
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "owner",
          type: NotificationType.MEMBER_JOINED,
          title: "Ana se unió a Diseño",
          href: "/w/ws-1/members",
          actorId: "ana",
        }),
        expect.objectContaining({ userId: "admin" }),
      ],
    });
    expect(publishToUser).toHaveBeenCalledTimes(2);
    expect(publishToUser).toHaveBeenCalledWith("owner", {
      type: "notification",
    });
    expect(publishToUser).toHaveBeenCalledWith("admin", {
      type: "notification",
    });
  });

  it.each([WorkspaceRole.MEMBER, WorkspaceRole.GUEST])(
    "no cambia el rol ni avisa cuando ya era %s",
    async () => {
      prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
      prismaMock.workspaceMember.createMany.mockResolvedValue({ count: 0 });

      await expect(joinWorkspaceViaLink(TOKEN, USER)).resolves.toEqual({
        workspaceId: "ws-1",
        joined: false,
      });
      expect(prismaMock.workspaceInvite.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.workspaceMember.update).not.toHaveBeenCalled();
      expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
      expect(publishToUser).not.toHaveBeenCalled();
    },
  );

  it("mantiene el alta aunque falle la notificación", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
    prismaMock.workspaceMember.createMany.mockResolvedValue({ count: 1 });
    prismaMock.workspaceMember.findMany.mockResolvedValue([
      { userId: "owner" },
    ]);
    prismaMock.notification.createMany.mockRejectedValue(new Error("SMTP"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(joinWorkspaceViaLink(TOKEN, USER)).resolves.toEqual({
      workspaceId: "ws-1",
      joined: true,
    });
  });

  it("no crea notificaciones cuando no hay otros admins", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
    prismaMock.workspaceMember.createMany.mockResolvedValue({ count: 1 });
    prismaMock.workspaceMember.findMany.mockResolvedValue([]);

    await joinWorkspaceViaLink(TOKEN, USER);

    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it("usa el email en el título cuando falta el nombre", async () => {
    prismaMock.workspace.findUnique.mockResolvedValue(WORKSPACE);
    prismaMock.workspaceMember.createMany.mockResolvedValue({ count: 1 });
    prismaMock.workspaceMember.findMany.mockResolvedValue([
      { userId: "owner" },
    ]);
    prismaMock.notification.createMany.mockResolvedValue({ count: 1 });

    await joinWorkspaceViaLink(TOKEN, { ...USER, name: null });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ title: "Ana@X.com se unió a Diseño" })],
    });
  });
});
