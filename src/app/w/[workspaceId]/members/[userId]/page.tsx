import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMemberProfile } from "@/server/services/member";
import { hoursLabel } from "@/features/time/week";
import { RoleBadge } from "@/features/workspace/components/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

const joinedFmt = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ workspaceId: string; userId: string }>;
}) {
  const { workspaceId, userId } = await params;
  const viewer = await getCurrentUser();

  // Tu propio perfil se edita en /account; aquí solo se ve el de otros.
  if (userId === viewer.id) redirect("/account");

  const profile = await getMemberProfile(workspaceId, userId, viewer.id);
  if (!profile) notFound();

  const initial = (
    profile.name?.trim()?.charAt(0) || profile.email.charAt(0)
  ).toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-12 sm:py-16">
      <Link
        href={`/w/${workspaceId}/members`}
        className="text-muted-foreground hover:text-foreground transition-ios mb-6 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Miembros
      </Link>

      <Card variant="glass" className="items-center gap-2 text-center">
        <Avatar size="xl">
          {profile.image && (
            <AvatarImage
              src={profile.image}
              alt={profile.name ?? profile.email}
            />
          )}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <h1 className="font-heading mt-2 text-2xl font-bold tracking-tight">
          {profile.name || profile.email}
        </h1>
        {profile.name && (
          <p className="text-muted-foreground text-sm">{profile.email}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <RoleBadge role={profile.role} />
        </div>
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <Calendar className="size-3.5" />
          Se unió el {joinedFmt.format(new Date(profile.joinedAt))}
        </p>
      </Card>

      {profile.stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card variant="glass" className="items-center gap-1 text-center">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <Clock className="size-3.5" />
              Horas este mes
            </span>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {hoursLabel(profile.stats.minutesThisMonth)} h
            </p>
          </Card>
          <Card variant="glass" className="items-center gap-1 text-center">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              <CheckCircle2 className="size-3.5" />
              Tareas completadas
            </span>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {profile.stats.tasksCompleted}
            </p>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-center text-xs">
          Solo un administrador puede ver las estadísticas de productividad de
          un compañero.
        </p>
      )}
    </div>
  );
}
