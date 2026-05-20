"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setError("Could not reach the server. Restart the dev server (rm -rf .next && npm run dev).");
      setPending(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data.error ??
        (res.status === 500
          ? "Server error during sign-in — try restarting the dev server."
          : "Could not sign in");
      setError(msg);
      setPending(false);
      return;
    }
    router.push(data.next ?? "/agency/workbench");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mk-auth-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={process.env.NODE_ENV === "development" ? "owner@mademoiselle.demo" : undefined}
          className="mk-auth-input"
        />
      </div>
      <div>
        <label className="mk-auth-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mk-auth-input"
        />
      </div>
      {error && <p className="mk-auth-error">{error}</p>}
      <button type="submit" disabled={pending} className="mk-auth-btn">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
