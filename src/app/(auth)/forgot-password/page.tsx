import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <Link href="/login" className="text-sm text-ink-muted">
        &larr; Back to login
      </Link>
      <h1 className="mt-6 font-serif text-3xl tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Enter your email and we&apos;ll send a link to set a new password.
      </p>
      <ForgotForm />
    </div>
  );
}
