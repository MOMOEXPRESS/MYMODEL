"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { consumeTeamInvite } from "@/app/agency/settings/actions";

export function TeamSignupForm({
  token,
  prefillEmail,
}: {
  token: string;
  prefillEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await consumeTeamInvite({
        token,
        displayName: fd.get("displayName"),
        password: fd.get("password"),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Then log in via the login API.
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: prefillEmail, password: fd.get("password") }),
      });
      if (loginRes.ok) {
        router.push("/agency");
        router.refresh();
      } else {
        router.push("/login");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="ll-label">Email</label>
        <input value={prefillEmail} disabled className="ll-input" />
      </div>
      <div>
        <label className="ll-label">Your name</label>
        <input name="displayName" required className="ll-input" autoComplete="name" />
      </div>
      <div>
        <label className="ll-label">Password</label>
        <input name="password" type="password" required minLength={8} className="ll-input" autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Creating…" : "Accept & join"}
      </button>
    </form>
  );
}
