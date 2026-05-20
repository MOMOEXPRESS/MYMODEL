"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: fd.get("password") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not reset");
        return;
      }
      router.push(json.next ?? "/agency");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mk-auth-label">New password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mk-auth-input"
        />
        <p className="mt-1 text-xs text-[#9c958d]">At least 8 characters.</p>
      </div>
      {error && <p className="text-sm mk-auth-error">{error}</p>}
      <button type="submit" disabled={pending} className="mk-auth-btn">
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
