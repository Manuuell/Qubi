"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getOptionalUser } from "@/lib/auth";
import { isValidJoinToken } from "@/lib/join-token";
import { ensureCurrentInRing } from "@/server/account-ring";
import { checkRateLimit } from "@/server/lib/rate-limit";
import { clearPendingJoin, setPendingJoin } from "@/server/pending-join";
import {
  disableInviteLink,
  enableInviteLink,
  INVALID_LINK_ERROR,
  joinWorkspaceViaLink,
  regenerateInviteLink,
} from "@/server/services/invite-link";

export async function enableInviteLinkAction(input: {
  workspaceId: string;
}): Promise<void> {
  const user = await getCurrentUser();
  await enableInviteLink(input.workspaceId, user.id);
  revalidatePath(`/w/${input.workspaceId}/members`);
}

export async function regenerateInviteLinkAction(input: {
  workspaceId: string;
}): Promise<void> {
  const user = await getCurrentUser();
  await regenerateInviteLink(input.workspaceId, user.id);
  revalidatePath(`/w/${input.workspaceId}/members`);
}

export async function disableInviteLinkAction(input: {
  workspaceId: string;
}): Promise<void> {
  const user = await getCurrentUser();
  await disableInviteLink(input.workspaceId, user.id);
  revalidatePath(`/w/${input.workspaceId}/members`);
}

export type JoinFormState = { error?: string };

export async function joinWorkspaceViaLinkAction(
  _prev: JoinFormState,
  formData: FormData,
): Promise<JoinFormState> {
  const token = String(formData.get("token") ?? "");
  if (!isValidJoinToken(token)) return { error: INVALID_LINK_ERROR };

  const user = await getOptionalUser();
  if (!user) {
    await setPendingJoin(token);
    redirect("/login");
  }

  if (formData.get("expectedUserId") !== user.id) {
    return {
      error:
        "Cambiaste de cuenta en otra pestaña. Recarga la página para ver con qué cuenta vas a unirte.",
    };
  }

  const rateLimit = checkRateLimit(`join-link:${user.id}`, {
    max: 10,
    windowMs: 10 * 60_000,
  });
  if (!rateLimit.ok) {
    return { error: "Demasiados intentos seguidos. Espera unos minutos." };
  }

  let workspaceId: string;
  try {
    ({ workspaceId } = await joinWorkspaceViaLink(token, user));
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_LINK_ERROR) {
      return { error: INVALID_LINK_ERROR };
    }
    console.error("[invite-link] no se pudo completar la unión", error);
    return { error: "No pudimos unirte al espacio. Inténtalo de nuevo." };
  }

  await clearPendingJoin();
  revalidatePath("/", "layout");
  redirect(`/w/${workspaceId}`);
}

export async function startJoinLoginAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (isValidJoinToken(token)) await setPendingJoin(token);
  redirect("/login");
}

export async function switchAccountForJoinAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (isValidJoinToken(token)) await setPendingJoin(token);
  await ensureCurrentInRing();
  redirect("/login?add=1");
}

export async function dismissJoinAction() {
  await clearPendingJoin();
  redirect("/");
}
