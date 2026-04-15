import Link from "next/link";
import { ModelSignupForm } from "./model-signup-form";

export default function ModelSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  return (
    <div>
      <Link href="/" className="text-sm text-ink-muted">&larr; Back</Link>
      <h1 className="mt-6 font-serif text-3xl tracking-tight">Join your agency</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Use the signup code your agency gave you. No code? Ask your booker.
      </p>
      <ModelSignupForm searchParams={searchParams} />
      <p className="mt-6 text-sm text-ink-muted">
        Already signed up? <Link className="text-ink underline underline-offset-4" href="/login">Log in</Link>
      </p>
    </div>
  );
}
