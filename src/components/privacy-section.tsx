"use client";

import { Download, AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PrivacySection() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    const typed = prompt(
      "Type DELETE to confirm permanent deletion of your account and data.",
    );
    if (typed !== "DELETE") return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/me/delete", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not delete");
        return;
      }
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <section className="ll-card p-6">
      <h2 className="font-medium">Privacy &amp; data</h2>
      <p className="mt-2 text-sm text-ink-muted">
        Under GDPR you&apos;re entitled to a copy of everything we hold about you and to
        request permanent deletion. Both are one click.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href="/api/me/export"
          className="ll-btn-secondary text-sm"
          download
        >
          <Download size={14} /> Download my data (JSON)
        </a>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="ll-btn-ghost text-sm text-red-600"
        >
          <AlertTriangle size={14} /> {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      <p className="mt-4 text-[11px] text-ink-subtle leading-relaxed">
        Deletion is permanent and immediate. Assignments and invoices already issued
        stay on the agency&apos;s ledger but no longer carry your personal details.
        Agency owners must transfer ownership before they can delete.
      </p>
    </section>
  );
}
