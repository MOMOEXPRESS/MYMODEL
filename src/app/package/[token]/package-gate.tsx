"use client";

import { useState } from "react";
import { unlockPackage } from "./actions";

export function PackageGate({
  token,
  agencyName,
  title,
}: {
  token: string;
  agencyName: string;
  title: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await unlockPackage({ token, password });
    if (!res.ok) {
      setError(res.error ?? "Wrong password");
      setPending(false);
      return;
    }
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-8">
      <form onSubmit={submit} className="ll-card p-8 w-full max-w-sm space-y-4">
        <p className="text-xs uppercase tracking-wider text-ink-subtle">{agencyName}</p>
        <h1 className="font-serif text-2xl">{title}</h1>
        <p className="text-sm text-ink-muted">This package is password-protected.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="ll-input w-full text-sm"
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button type="submit" disabled={pending} className="ll-btn-primary w-full">
          {pending ? "Checking…" : "View package"}
        </button>
      </form>
    </main>
  );
}
