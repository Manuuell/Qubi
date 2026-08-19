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
  searchParams: Promise<{
    add?: string;
    verify?: string;
    reset?: string;
    email?: string;
  }>;
}) {
  const { add, verify, reset, email } = await searchParams;
  const addMode = add === "1";

  // La entrada por correo y el registro están ocultos: se entra con Google.
  // Nada se ha borrado (las acciones y las rutas de recuperación siguen ahí),
  // y /login?email=1 los vuelve a mostrar — es la salida de emergencia para
  // quien tenga cuenta con contraseña y aún no la haya enlazado con Google.
  const showEmailLogin = email === "1";

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
    <div className="bg-board bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <LoginForm
        googleEnabled={googleEnabled}
        addMode={addMode}
        notice={notice}
        showEmailLogin={showEmailLogin}
      />
      {/* La tarjeta de cuentas de invitado se deja de mostrar, pero el
          componente (guest-accounts-card.tsx), sus credenciales y el seed que
          las crea siguen intactos: basta con volver a montarla aquí. */}
    </div>
  );
}
