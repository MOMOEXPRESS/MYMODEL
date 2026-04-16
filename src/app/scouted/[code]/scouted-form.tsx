"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";

export function ScoutedForm({
  code,
  agencyName,
}: {
  code: string;
  agencyName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/scouted/${code}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Could not submit. Try again.");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-board-confirmed/10 border border-board-confirmed/30 text-board-confirmed text-sm flex items-start gap-2">
        <Check size={16} className="mt-0.5 shrink-0" />
        <div>
          Submitted. A booker at {agencyName} will review and reach out if
          there&apos;s a fit.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="ll-label">Full name</label>
        <input name="name" required className="ll-input" autoComplete="name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Email</label>
          <input name="email" type="email" required className="ll-input" autoComplete="email" />
        </div>
        <div>
          <label className="ll-label">Phone</label>
          <input name="phone" className="ll-input" autoComplete="tel" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Instagram</label>
          <input
            name="instagramHandle"
            className="ll-input"
            placeholder="@yourhandle"
          />
        </div>
        <div>
          <label className="ll-label">City</label>
          <input name="city" className="ll-input" />
        </div>
      </div>
      <div>
        <label className="ll-label">A recent photo <span className="text-ink-subtle normal-case">(selfie is fine)</span></label>
        <input
          name="image"
          type="file"
          accept="image/*"
          capture="environment"
          className="ll-input"
        />
      </div>
      <div>
        <label className="ll-label">Where did we spot you?</label>
        <input
          name="source"
          className="ll-input"
          placeholder="Open casting, Marais, event…"
          defaultValue="Open casting"
        />
      </div>
      <div>
        <label className="ll-label">Anything to add <span className="text-ink-subtle normal-case">(optional)</span></label>
        <textarea name="notes" rows={3} className="ll-input" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Submitting…" : "Submit to scouting"}
      </button>
    </form>
  );
}
