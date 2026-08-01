import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { isAdminRole, isTrustedTimeEditor } from "./permissions";

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

describe("isTrustedTimeEditor", () => {
  it("acepta un correo de la lista", () => {
    expect(isTrustedTimeEditor("djerson347@gmail.com")).toBe(true);
  });

  it("rechaza un correo fuera de la lista", () => {
    expect(isTrustedTimeEditor("cualquiera@gmail.com")).toBe(false);
  });

  it("rechaza null/undefined", () => {
    expect(isTrustedTimeEditor(null)).toBe(false);
    expect(isTrustedTimeEditor(undefined)).toBe(false);
  });
});
