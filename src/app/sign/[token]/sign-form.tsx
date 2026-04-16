"use client";

import { useState, useTransition } from "react";
import { signContract } from "@/app/agency/contracts/actions";

export function SignForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await signContract({
        token,
        fullName: fd.get("fullName"),
      });
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-board-confirmed/10 border border-board-confirmed/30 text-board-confirmed text-sm">
        Signed. You can close this page — the agency has been notified.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <div>
        <label className="ll-label">Full legal name</label>
        <input
          name="fullName"
          required
          className="ll-input"
          placeholder="First Last"
          autoComplete="name"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Signing…" : "Sign contract"}
      </button>
    </form>
  );
}
