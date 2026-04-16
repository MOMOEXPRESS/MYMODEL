"use client";

import { useState, useTransition } from "react";
import type { PlanId } from "@/lib/plans";

export function BillingActions({
  planId,
  isCurrent,
  canManage,
  hasCustomer,
}: {
  planId: PlanId;
  isCurrent: boolean;
  canManage: boolean;
  hasCustomer: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start checkout");
        return;
      }
      window.location.href = json.url;
    });
  }

  function portal() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not open portal");
        return;
      }
      window.location.href = json.url;
    });
  }

  if (!canManage) return null;

  if (isCurrent && hasCustomer) {
    return (
      <>
        <button onClick={portal} disabled={pending} className="ll-btn-secondary w-full">
          {pending ? "Opening…" : "Manage subscription"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </>
    );
  }

  return (
    <>
      <button onClick={start} disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Redirecting…" : isCurrent ? "Restart" : "Start 14-day trial"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );
}
