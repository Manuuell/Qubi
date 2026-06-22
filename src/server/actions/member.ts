"use server";

import { revalidatePath } from "next/cache";
import { WorkspaceRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import * as memberService from "@/server/services/member";

export async function addMemberAction(input: {
  workspaceId: string;
  email: string;
  role?: WorkspaceRole;
}) {
  const user = await getCurrentUser();
  await memberService.addMemberByEmail(
    input.workspaceId,
    user.id,
    input.email,
    input.role ?? WorkspaceRole.MEMBER,
  );
  revalidatePath(`/w/${input.workspaceId}/members`);
}

export async function removeMemberAction(input: {
  workspaceId: string;
  memberUserId: string;
}) {
  const user = await getCurrentUser();
  await memberService.removeMember(
    input.workspaceId,
    user.id,
    input.memberUserId,
  );
  revalidatePath(`/w/${input.workspaceId}/members`);
}
