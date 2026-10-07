import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QubiMark } from "@/components/qubi-mark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { JoinConfirmActions } from "@/features/workspace/components/join-confirm-actions";
import { getOptionalUser } from "@/lib/auth";
import { getWorkspaceRole } from "@/server/lib/permissions";
import { startJoinLoginAction } from "@/server/actions/invite-link";
import { findWorkspaceByInviteToken } from "@/server/services/invite-link";

export const dynamic = "force-dynamic";

const getPreview = cache((token: string) => findWorkspaceByInviteToken(token));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const workspace = await getPreview(token);
  if (!workspace) {
    return {
      title: "Enlace de invitación no válido · Qubi",
      robots: { index: false, follow: false },
    };
  }

  const title = `Únete a ${workspace.name} en Qubi`;
  const description = `Te invitaron a unirte al espacio ${workspace.name} en Qubi.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "Qubi", type: "website" },
    robots: { index: false, follow: false },
  };
}

function WorkspaceBadge({ icon, name }: { icon: string | null; name: string }) {
  return (
    <span className="bg-primary/10 text-primary mx-auto grid size-14 place-items-center rounded-full text-xl font-semibold">
      {icon ?? name.charAt(0).toUpperCase()}
    </span>
  );
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const workspace = await getPreview(token);

  if (!workspace) {
    return (
      <div className="bg-board bg-background flex min-h-screen items-center justify-center p-4">
        <div className="glass-strong w-full max-w-sm space-y-6 rounded-3xl p-8 text-center">
          <QubiMark size={40} className="mx-auto" />
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Este enlace ya no funciona
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Puede que lo hayan desactivado o cambiado por uno nuevo. Pide a
              quien te lo compartió el enlace actual.
            </p>
          </div>
          <Button
            render={
              <Link href="/" prefetch={false}>
                Ir a Qubi
              </Link>
            }
            className="w-full"
          />
        </div>
      </div>
    );
  }

  const membersLabel = `${workspace.memberCount} ${
    workspace.memberCount === 1 ? "miembro" : "miembros"
  }`;

  const user = await getOptionalUser();
  if (!user) {
    const userAgent = (await headers()).get("user-agent") ?? "";
    const isInAppBrowser =
      /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|TikTok|musical_ly|Line\/|MicroMessenger|Snapchat|; wv\)/i.test(
        userAgent,
      );

    return (
      <div className="bg-board bg-background flex min-h-screen items-center justify-center p-4">
        <div className="glass-strong w-full max-w-sm space-y-6 rounded-3xl p-8 text-center">
          <QubiMark size={40} className="mx-auto" />
          <WorkspaceBadge icon={workspace.icon} name={workspace.name} />
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Te invitaron a unirte a
            </p>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              {workspace.name}
            </h1>
            <p className="text-muted-foreground text-sm">{membersLabel}</p>
            <p className="text-sm">
              Inicia sesión o crea tu cuenta para unirte. Entrarás como Miembro.
            </p>
          </div>
          <form action={startJoinLoginAction}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="w-full">
              Continuar
            </Button>
          </form>
          {isInAppBrowser && (
            <p className="bg-muted/50 text-muted-foreground rounded-2xl border px-3 py-2 text-xs">
              ¿Lo abriste desde otra app? Si Google no te deja entrar, abre este
              enlace en Chrome o Safari.
            </p>
          )}
        </div>
      </div>
    );
  }

  const role = await getWorkspaceRole(workspace.id, user.id);
  if (role !== null) redirect(`/w/${workspace.id}`);

  const accountName = user.name || user.email;
  return (
    <div className="bg-board bg-background flex min-h-screen items-center justify-center p-4">
      <div className="glass-strong w-full max-w-sm space-y-6 rounded-3xl p-8 text-center">
        <QubiMark size={40} className="mx-auto" />
        <WorkspaceBadge icon={workspace.icon} name={workspace.name} />
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Vas a unirte a</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            {workspace.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {membersLabel} · Entrarás como Miembro
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">como</p>
          <div className="bg-muted/50 mx-auto flex items-center gap-3 rounded-2xl border px-3 py-2 text-left">
            <Avatar>
              {user.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback>
                {accountName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{accountName}</p>
              {user.name && (
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <JoinConfirmActions token={token} expectedUserId={user.id} />
      </div>
    </div>
  );
}
