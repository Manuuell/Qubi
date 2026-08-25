import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  "verify:ok": "Tu correo quedó confirmado. Ya puedes iniciar sesión.",
  "verify:invalid": "El enlace de verificación no es válido o ha caducado.",
  "reset:ok": "Contraseña actualizada. Inicia sesión con la nueva.",
};

// Auth.js devuelve aquí con ?error=... cuando el acceso con Google falla. Sin
// esto la persona aterrizaba en el login sin explicación ninguna.
const ERROR_NOTICES: Record<string, string> = {
  // No debería ocurrir ya (el enlace por correo es automático), pero si algún
  // día vuelve a saltar, al menos dice por dónde salir.
  OAuthAccountNotLinked:
    "Ese correo ya tiene una cuenta en Qubi. Entra con tu contraseña desde “Iniciar sesión de otra forma”.",
  AccessDenied: "No autorizaste el acceso con Google.",
  Configuration:
    "El acceso con Google no está bien configurado en este servidor.",
};

const ERROR_FALLBACK =
  "No se pudo entrar con Google. Inténtalo de nuevo o usa tu correo y contraseña.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    add?: string;
    verify?: string;
    reset?: string;
    email?: string;
    error?: string;
  }>;
}) {
  const { add, verify, reset, email, error } = await searchParams;
  const addMode = add === "1";

  // Google es la vía principal, pero el correo y contraseña siguen ahí como
  // alternativa: el formulario se abre desde el propio login, y /login?email=1
  // lo deja abierto de entrada (útil para enlazar desde un correo o un aviso).
  // Si el acceso con Google falló, se abre solo: es la salida que necesita.
  const showEmailLogin = email === "1" || Boolean(error);

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

  const errorNotice = error
    ? (ERROR_NOTICES[error] ?? ERROR_FALLBACK)
    : undefined;

  return (
    <div className="bg-board bg-background flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <LoginForm
        googleEnabled={googleEnabled}
        addMode={addMode}
        notice={notice}
        errorNotice={errorNotice}
        showEmailLogin={showEmailLogin}
      />
      {/* La tarjeta de cuentas de invitado se deja de mostrar, pero el
          componente (guest-accounts-card.tsx), sus credenciales y el seed que
          las crea siguen intactos: basta con volver a montarla aquí. */}
    </div>
  );
}
