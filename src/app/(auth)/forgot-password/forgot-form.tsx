"use client";

import { useState } from "react";

export function ForgotForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: fd.get("email") }),
    });
    setPending(false);
    if (res.status === 429) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Too many requests");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="mt-6 text-sm text-ink-muted">
        If there&apos;s a LuxLane account with that email, we sent a reset link. Check
        your inbox (and the spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="ll-label">Email</label>
        <input name="email" type="email" required className="ll-input" autoComplete="email" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
