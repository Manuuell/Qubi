"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { IssueStatus } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import * as issueService from "@/server/services/issue";

export async function createIssueAction(input: {
  workspaceId: string;
  title: string;
}) {
  const user = await getCurrentUser();
  const issue = await issueService.createIssue(
    input.workspaceId,
    user.id,
    input.title,
  );
  revalidatePath(`/w/${input.workspaceId}/issues`);
  redirect(`/w/${input.workspaceId}/issues/${issue.number}`);
}

export async function setIssueStatusAction(input: {
  issueId: string;
  workspaceId: string;
  number: number;
  status: IssueStatus;
}) {
  const user = await getCurrentUser();
  await issueService.setIssueStatus(input.issueId, user.id, input.status);
  revalidatePath(`/w/${input.workspaceId}/issues/${input.number}`);
  revalidatePath(`/w/${input.workspaceId}/issues`);
}

export async function addIssueCommentAction(input: {
  issueId: string;
  workspaceId: string;
  number: number;
  body: string;
}) {
  if (!input.body.trim()) return;
  const user = await getCurrentUser();
  await issueService.addIssueComment(input.issueId, user.id, input.body);
  revalidatePath(`/w/${input.workspaceId}/issues/${input.number}`);
}
