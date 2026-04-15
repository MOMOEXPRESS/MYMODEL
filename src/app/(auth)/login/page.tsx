import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <Link href="/" className="text-sm text-ink-muted">&larr; Back</Link>
      <h1 className="mt-6 font-serif text-3xl tracking-tight">Log in</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Welcome back. Bookers, production and models all use the same sign-in.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-ink-muted">
        New agency? <Link className="text-ink underline underline-offset-4" href="/signup/agency">Create an account</Link>
      </p>
      <p className="mt-2 text-sm text-ink-muted">
        Signed model? <Link className="text-ink underline underline-offset-4" href="/signup/model">Join with your agency code</Link>
      </p>
    </div>
  );
}
