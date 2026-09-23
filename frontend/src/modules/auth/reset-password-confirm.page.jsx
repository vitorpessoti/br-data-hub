import { Suspense } from "react";
import ResetPasswordConfirmForm from "@/modules/auth/components/reset-password-confirm-form.component";

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense>
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}
