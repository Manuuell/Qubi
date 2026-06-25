import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const { add } = await searchParams;
  const addMode = add === "1";

  // En modo "agregar cuenta" se permite el login aunque ya haya una sesión.
  const session = await auth();
  if (session?.user && !addMode) redirect("/");

  const googleEnabled = !!(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <LoginForm googleEnabled={googleEnabled} addMode={addMode} />
    </div>
  );
}
