import Link from "next/link";
import { ResetForm } from "./reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token;

  return (
    <div>
      <Link href="/login" className="text-sm text-ink-muted">
        &larr; Back to login
      </Link>
      <h1 className="mt-6 font-serif text-3xl tracking-tight">Set a new password</h1>
      {!token ? (
        <p className="mt-4 text-sm text-ink-muted">
          This link is missing a token. Request a fresh one from{" "}
          <Link href="/forgot-password" className="underline underline-offset-4">
            forgot password
          </Link>
          .
        </p>
      ) : (
        <ResetForm token={token} />
      )}
    </div>
  );
}
