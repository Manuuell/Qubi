import Link from "next/link";
import { Button } from "@/components/ui/button";
import { verifyEmailAction } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm space-y-6 rounded-xl border p-8 text-center shadow-sm">
        <div className="font-display text-3xl font-bold tracking-tight">
          Qubi
        </div>

        {token ? (
          <>
            <p className="text-muted-foreground text-sm">
              Confirma que este correo es tuyo para activar tu cuenta.
            </p>
            <form action={verifyEmailAction}>
              <input type="hidden" name="token" value={token} />
              <Button type="submit" className="w-full">
                Confirmar mi correo
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-destructive text-sm">
              El enlace no incluye un token de verificación.
            </p>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Volver a iniciar sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
