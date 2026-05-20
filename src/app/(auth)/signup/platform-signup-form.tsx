"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlatformSignupForm({
  role,
  showClientFields,
  showCreativeFields,
}: {
  role: "CLIENT" | "CREATIVE" | "MEMBER";
  showClientFields?: boolean;
  showCreativeFields?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup-platform", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role,
        displayName: form.get("displayName"),
        email: form.get("email"),
        password: form.get("password"),
        companyName: form.get("companyName"),
        city: form.get("city"),
        clientSubtype: form.get("clientSubtype"),
        creativeSubtype: form.get("creativeSubtype"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not sign up");
      setPending(false);
      return;
    }
    router.push(data.next ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mk-auth-label" htmlFor="displayName">
          Name
        </label>
        <input id="displayName" name="displayName" required className="mk-auth-input" />
      </div>
      {showClientFields && (
        <>
          <div>
            <label className="mk-auth-label" htmlFor="companyName">
              Company (optional)
            </label>
            <input id="companyName" name="companyName" className="mk-auth-input" />
          </div>
          <div>
            <label className="mk-auth-label" htmlFor="clientSubtype">
              I am a…
            </label>
            <select id="clientSubtype" name="clientSubtype" className="mk-auth-input">
              <option value="BRAND">Brand / advertiser</option>
              <option value="MEDIA_AGENCY">Media / creative agency</option>
              <option value="PRODUCTION">Production company</option>
              <option value="MAGAZINE">Magazine / publisher</option>
              <option value="ECOMMERCE">E-commerce / retailer</option>
              <option value="CASTING_DIRECTOR">Casting director</option>
              <option value="PHOTOGRAPHER">Photographer</option>
              <option value="DESIGNER">Designer / label</option>
              <option value="PR_EVENTS">PR / events</option>
              <option value="TV_FILM">TV / film</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </>
      )}
      {showCreativeFields && (
        <div>
          <label className="mk-auth-label" htmlFor="creativeSubtype">
            Discipline
          </label>
          <select id="creativeSubtype" name="creativeSubtype" className="mk-auth-input">
            <option value="PHOTOGRAPHER">Photographer</option>
            <option value="STYLIST">Stylist</option>
            <option value="MUA">Makeup artist</option>
            <option value="HAIR">Hair</option>
            <option value="SET_DESIGN">Set design</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      )}
      <div>
        <label className="mk-auth-label" htmlFor="city">
          City (optional)
        </label>
        <input id="city" name="city" className="mk-auth-input" />
      </div>
      <div>
        <label className="mk-auth-label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className="mk-auth-input" />
      </div>
      <div>
        <label className="mk-auth-label" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" required minLength={8} className="mk-auth-input" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={pending} className="mk-auth-btn">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
