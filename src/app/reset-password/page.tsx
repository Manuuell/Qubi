import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <ResetPasswordForm token={token ?? ""} />
    </div>
  );
}
