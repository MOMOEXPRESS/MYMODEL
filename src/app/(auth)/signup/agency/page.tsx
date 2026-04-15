import Link from "next/link";
import { AgencySignupForm } from "./agency-signup-form";

export default function AgencySignupPage() {
  return (
    <div>
      <Link href="/" className="text-sm text-ink-muted">&larr; Back</Link>
      <h1 className="mt-6 font-serif text-3xl tracking-tight">Start your agency</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Create your agency and invite your roster. No credit card required.
      </p>
      <AgencySignupForm />
      <p className="mt-6 text-sm text-ink-muted">
        Already have an account? <Link className="text-ink underline underline-offset-4" href="/login">Log in</Link>
      </p>
    </div>
  );
}
