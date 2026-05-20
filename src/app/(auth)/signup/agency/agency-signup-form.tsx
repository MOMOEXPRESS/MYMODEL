"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgencySignupForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup-agency", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agencyName: form.get("agencyName"),
        city: form.get("city"),
        country: form.get("country") || "FR",
        ownerName: form.get("ownerName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create agency");
      setPending(false);
      return;
    }
    router.push(data.next ?? "/agency");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mk-auth-label" htmlFor="agencyName">Agency name</label>
        <input id="agencyName" name="agencyName" required className="mk-auth-input" placeholder="Mademoiselle Paris" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mk-auth-label" htmlFor="city">City</label>
          <input id="city" name="city" required className="mk-auth-input" placeholder="Paris" />
        </div>
        <div>
          <label className="mk-auth-label" htmlFor="country">Country</label>
          <input id="country" name="country" defaultValue="FR" maxLength={2} className="mk-auth-input uppercase" />
        </div>
      </div>
      <div>
        <label className="mk-auth-label" htmlFor="ownerName">Your name</label>
        <input id="ownerName" name="ownerName" required className="mk-auth-input" autoComplete="name" />
      </div>
      <div>
        <label className="mk-auth-label" htmlFor="email">Work email</label>
        <input id="email" name="email" type="email" required className="mk-auth-input" autoComplete="email" />
      </div>
      <div>
        <label className="mk-auth-label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required minLength={8} className="mk-auth-input" autoComplete="new-password" />
        <p className="mt-1 text-xs text-[#9c958d]">At least 8 characters.</p>
      </div>
      {error && <p className="text-sm mk-auth-error">{error}</p>}
      <button type="submit" disabled={pending} className="mk-auth-btn">
        {pending ? "Creating…" : "Create agency"}
      </button>
    </form>
  );
}
