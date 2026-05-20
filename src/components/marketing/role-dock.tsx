"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type RoleEntry = {
  slug: string;
  label: string;
  tagline: string;
  href: string;
  hue: string;
};

export function RoleDock({ roles, signInLabel }: { roles: RoleEntry[]; signInLabel: string }) {
  return (
    <section className="mx-auto max-w-[72rem] px-5 sm:px-8 pb-28 lg:pb-36">
      <div className="text-center mb-14 lg:mb-16">
        <p className="mk-eyebrow text-[var(--mk-muted)]">Step on</p>
        <h2 className="mk-display text-3xl sm:text-4xl mt-4">Who are you today?</h2>
      </div>
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {roles.map((role) => (
          <div key={role.slug}>
            <Link
              href={role.href}
              className="group mk-role-card flex flex-col items-center rounded-2xl px-7 py-6 min-w-[148px]"
            >
              <span
                className="h-11 w-11 rounded-full flex items-center justify-center text-base font-medium border border-[var(--mk-line)]"
                style={{ color: role.hue }}
              >
                {role.label[0]}
              </span>
              <span className="mt-4 font-medium text-[var(--mk-ink)] tracking-tight">{role.label}</span>
              <span className="mt-1.5 text-xs text-[var(--mk-muted)] text-center max-w-[130px] leading-relaxed">
                {role.tagline}
              </span>
              <ArrowUpRight
                size={14}
                className="mt-4 text-[var(--mk-muted)] opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
              />
            </Link>
          </div>
        ))}
      </div>
      <p className="text-center mt-12 text-sm text-[var(--mk-muted)]">
        Already in?{" "}
        <Link
          href="/login"
          className="text-[var(--mk-ink)] border-b border-[var(--mk-line)] hover:border-[var(--mk-warm)] transition-colors"
        >
          {signInLabel}
        </Link>
      </p>
    </section>
  );
}
