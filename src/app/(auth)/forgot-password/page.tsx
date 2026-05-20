import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <Link href="/login" className="text-sm text-[#9c958d]">
        &larr; Back to login
      </Link>
      <h1 className="mt-6 mk-display text-3xl text-[#f5f0eb] tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm text-[#9c958d]">
        Enter your email and we&apos;ll send a link to set a new password.
      </p>
      <ForgotForm />
    </div>
  );
}
