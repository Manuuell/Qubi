import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { readRing } from "@/server/account-ring";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { AvatarUpload } from "@/features/auth/components/avatar-upload";
import { ProfileNameForm } from "@/features/auth/components/profile-name-form";
import { SessionsSection } from "@/features/auth/components/sessions-section";
import { ThemeSection } from "@/components/theme-section";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

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
