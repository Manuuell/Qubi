import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <ForgotPasswordForm />
    </div>
  );
}
