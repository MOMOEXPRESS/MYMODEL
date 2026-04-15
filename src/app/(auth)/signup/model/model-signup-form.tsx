"use client";

import { useRouter } from "next/navigation";
import { use, useState } from "react";

export function ModelSignupForm({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const sp = use(searchParams);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup-model", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agencyCode: String(form.get("agencyCode") ?? "").toUpperCase(),
        displayName: form.get("displayName"),
        email: form.get("email"),
        password: form.get("password"),
        phone: form.get("phone") || undefined,
        division: form.get("division") || "WOMEN",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not sign up");
      setPending(false);
      return;
    }
    router.push(data.next ?? "/m");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="ll-label" htmlFor="agencyCode">Agency signup code</label>
        <input
          id="agencyCode"
          name="agencyCode"
          required
          defaultValue={sp.code ?? ""}
          className="ll-input uppercase tracking-widest font-mono"
          placeholder="PARIS001"
        />
      </div>
      <div>
        <label className="ll-label" htmlFor="displayName">Full name</label>
        <input id="displayName" name="displayName" required className="ll-input" autoComplete="name" />
      </div>
      <div>
        <label className="ll-label" htmlFor="division">Division</label>
        <select id="division" name="division" defaultValue="WOMEN" className="ll-input">
          <option value="WOMEN">Women</option>
          <option value="MEN">Men</option>
          <option value="CURVE">Curve</option>
          <option value="KIDS">Kids</option>
          <option value="TALENTS">Talents</option>
          <option value="NEW_FACES">New faces</option>
        </select>
      </div>
      <div>
        <label className="ll-label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="ll-input" autoComplete="email" />
      </div>
      <div>
        <label className="ll-label" htmlFor="phone">Phone <span className="text-ink-subtle normal-case">(optional)</span></label>
        <input id="phone" name="phone" className="ll-input" autoComplete="tel" />
      </div>
      <div>
        <label className="ll-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} className="ll-input" autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Creating…" : "Join agency"}
      </button>
    </form>
  );
}
