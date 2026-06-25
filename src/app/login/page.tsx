import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  "verify:ok": "Tu correo quedó confirmado. Ya puedes iniciar sesión.",
  "verify:invalid": "El enlace de verificación no es válido o ha caducado.",
  "reset:ok": "Contraseña actualizada. Inicia sesión con la nueva.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; verify?: string; reset?: string }>;
}) {
  const { add, verify, reset } = await searchParams;
  const addMode = add === "1";

  // En modo "agregar cuenta" se permite el login aunque ya haya una sesión.
  const session = await auth();
  if (session?.user && !addMode) redirect("/");

  const googleEnabled = !!(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  const notice = verify
    ? NOTICES[`verify:${verify}`]
    : reset
      ? NOTICES[`reset:${reset}`]
      : undefined;

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <LoginForm
        googleEnabled={googleEnabled}
        addMode={addMode}
        notice={notice}
      />
    </div>
  );
}
