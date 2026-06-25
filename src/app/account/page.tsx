import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-12 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">Tu cuenta</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        {user.name ? `${user.name} · ` : ""}
        {user.email}
      </p>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Contraseña</h2>
          <p className="text-muted-foreground text-sm">
            {user.hashedPassword
              ? "Cambia tu contraseña de acceso."
              : "Aún no tienes contraseña (entras con Google). Puedes establecer una."}
          </p>
        </div>
        <ChangePasswordForm hasPassword={Boolean(user.hashedPassword)} />
      </section>
    </div>
  );
}
