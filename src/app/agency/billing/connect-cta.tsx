"use client";

import { useState, useTransition } from "react";

export function ConnectCTA({
  connected,
  canManage,
}: {
  connected: boolean;
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start onboarding");
        return;
      }
      window.location.href = json.url;
    });
  }

  if (!canManage) return null;

  return (
    <div>
      <button onClick={onClick} disabled={pending} className="ll-btn-primary">
        {pending ? "Redirecting…" : connected ? "Continue Stripe setup" : "Connect Stripe"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600 text-right">{error}</p>}
    </div>
  );
}
