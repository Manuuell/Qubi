import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { readRing } from "@/server/account-ring";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { AvatarUpload } from "@/features/auth/components/avatar-upload";
import { ProfileNameForm } from "@/features/auth/components/profile-name-form";
import { SessionsSection } from "@/features/auth/components/sessions-section";
import { ThemeSection } from "@/components/theme-section";
import { GoogleCalendarSection } from "@/features/auth/components/google-calendar-section";
import {
  getConnection,
  googleCalendarConfigured,
} from "@/server/services/google-calendar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

// El aviso de la vuelta desde Google: la ruta de callback redirige aquí con
// ?calendar=..., porque un route handler no puede pintar interfaz.
const CALENDAR_NOTICES: Record<string, { text: string; ok: boolean }> = {
  ok: { text: "Google Calendar conectado.", ok: true },
  cancelado: { text: "No autorizaste el acceso al calendario.", ok: false },
  error: {
    text: "No se pudo conectar con Google Calendar. Inténtalo de nuevo.",
    ok: false,
  },
  no_configurado: {
    text: "Este servidor no tiene configurado el acceso a Google.",
    ok: false,
  },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  const user = await getCurrentUser();
  const { calendar } = await searchParams;
  const notice = calendar ? CALENDAR_NOTICES[calendar] : undefined;
  const calendarConnection = await getConnection(user.id);

  const ring = await readRing();
  const accounts = ring
    .filter((e) => e.userId !== user.id)
    .map((e) => ({ userId: e.userId, name: e.name, email: e.email }));

  return (
    <div className="bg-board mx-auto max-w-3xl px-4 py-8 sm:px-12 sm:py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground transition-ios mb-6 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <h1 className="font-heading mb-1 text-3xl font-bold tracking-tight">
        Tu cuenta
      </h1>
      <p className="text-muted-foreground mb-8 text-sm">
        {user.name ? `${user.name} · ` : ""}
        {user.email}
      </p>

      <div className="space-y-4">
        <Card variant="glass">
          <AvatarUpload
            name={user.name}
            email={user.email}
            image={user.image}
          />
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Nombre</CardTitle>
            <CardDescription>
              Así te verán el resto de miembros del espacio.
            </CardDescription>
          </CardHeader>
          <ProfileNameForm initialName={user.name ?? ""} />
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>
              Elige cómo se ve Qubi en este dispositivo.
            </CardDescription>
          </CardHeader>
          <ThemeSection />
        </Card>

        <Card variant="glass" id="password">
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>
              {user.hashedPassword
                ? "Cambia tu contraseña de acceso."
                : "Aún no tienes contraseña (entras con Google). Puedes establecer una."}
            </CardDescription>
          </CardHeader>
          <ChangePasswordForm hasPassword={Boolean(user.hashedPassword)} />
        </Card>

        <Card variant="glass" id="calendar">
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              Tus tareas con fecha se crean en tu propio calendario de Google y
              se actualizan cuando cambian.
            </CardDescription>
          </CardHeader>
          {notice && (
            <p
              className={`px-6 pb-3 text-sm ${notice.ok ? "text-primary" : "text-destructive"}`}
            >
              {notice.text}
            </p>
          )}
          <GoogleCalendarSection
            connection={calendarConnection}
            configured={googleCalendarConfigured()}
          />
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Sesiones</CardTitle>
            <CardDescription>
              Cuentas recordadas en este navegador. Cambia entre ellas sin
              volver a escribir la contraseña.
            </CardDescription>
          </CardHeader>
          <SessionsSection
            current={{ name: user.name ?? user.email, email: user.email }}
            accounts={accounts}
          />
        </Card>
      </div>
    </div>
  );
}
