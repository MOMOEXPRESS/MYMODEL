"use client";

import Link from "next/link";
import { Copy, Check, Users, Briefcase } from "lucide-react";
import { useEffect, useState } from "react";

export function OnboardingBanner({
  agencyCode,
  agencyName,
}: {
  agencyCode: string;
  agencyName: string;
}) {
  const [copied, setCopied] = useState(false);
  // Avoid hydration mismatch — origin is only known on the client.
  const [signupLink, setSignupLink] = useState(`/signup/model?code=${agencyCode}`);
  useEffect(() => {
    setSignupLink(`${window.location.origin}/signup/model?code=${agencyCode}`);
  }, [agencyCode]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="ll-card p-6 bg-gradient-to-br from-accent-soft/60 via-paper-elevated to-paper-elevated">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl tracking-tight">Welcome to {agencyName}.</h2>
          <p className="mt-2 text-sm text-ink-muted max-w-xl">
            Two moves and you&apos;re off: invite a handful of your models, then spin up
            your first job. The Board will light up as soon as you promote someone
            past Proposed.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/agency/jobs/new" className="ll-btn-primary">
              <Briefcase size={14} /> Create your first job
            </Link>
            <Link href="/agency/roster" className="ll-btn-secondary">
              <Users size={14} /> Open roster
            </Link>
          </div>
        </div>

        <div className="ll-card bg-paper-elevated p-4 min-w-[260px]">
          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
            Your agency signup code
          </div>
          <div className="mt-1 font-mono text-2xl tracking-widest text-center py-2">
            {agencyCode}
          </div>
          <button
            onClick={() => copy(signupLink)}
            className="ll-btn-secondary w-full text-xs"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
          <p className="mt-2 text-[10px] text-ink-subtle leading-snug">
            Send the link to any model you&apos;ve signed — they&apos;ll land on the
            signup form with the code prefilled.
          </p>
        </div>
      </div>
    </section>
  );
}
