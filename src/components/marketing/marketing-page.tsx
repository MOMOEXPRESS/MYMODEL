"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/lib/i18n";
import { LiveBoard } from "./live-board";
import { MarketingTicker } from "./ticker";
import { StoryRail } from "./story-rail";
import { RoleDock, type RoleEntry } from "./role-dock";

export type MarketingCopy = {
  headline: string;
  headlineAccent: string;
  sub: string;
  ctaStart: string;
  ctaLogin: string;
  signIn: string;
  stories: { time: string; title: string; body: string; accent: string }[];
  roles: RoleEntry[];
};

export function MarketingPage({ locale, copy }: { locale: Locale; copy: MarketingCopy }) {
  return (
    <div className="marketing-root min-h-screen overflow-x-hidden">
      <div className="mk-backdrop" aria-hidden>
        <div className="mk-vignette" />
      </div>
      <div aria-hidden className="mk-grain" />

      <div className="relative z-10">
        <header className="mk-nav sticky top-0 z-40">
          <div className="mx-auto max-w-[72rem] px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
            <Link href="/" className="inline-flex items-center gap-3 shrink-0 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mk-line)] bg-transparent text-[11px] font-medium tracking-widest text-[var(--mk-ink)] transition-colors group-hover:border-[var(--mk-warm)]">
                LL
              </span>
              <span className="text-sm font-medium tracking-tight text-[var(--mk-ink)]">LuxLane</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
              <div className="mk-locale hidden sm:block">
                <LocaleSwitcher current={locale} />
              </div>
              <Link
                href="/login"
                className="hidden md:inline-flex text-sm text-[var(--mk-muted)] hover:text-[var(--mk-ink)] transition-colors"
              >
                {copy.ctaLogin}
              </Link>
              <Link href="/signup/agency" className="mk-btn-primary text-xs sm:text-sm px-4 sm:px-5 py-2.5">
                {copy.ctaStart}
                <ArrowRight size={14} className="hidden sm:block opacity-70" />
              </Link>
            </div>
          </div>
        </header>

        <section className="min-h-[calc(100vh-4rem)] flex flex-col justify-center py-16 lg:py-24">
          <div className="mx-auto max-w-[72rem] px-5 sm:px-8 w-full">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-20 items-center">
              <div className="order-2 lg:order-1 max-w-xl">
                <p className="mk-fade-up mk-eyebrow mb-6">Fashion · bookings · network</p>
                <h1 className="mk-fade-up mk-fade-up-d1 mk-display text-display-sm sm:text-display lg:text-display-lg leading-[1.02]">
                  {copy.headline}
                  <span className="block mt-3 text-[var(--mk-muted)]">{copy.headlineAccent}</span>
                </h1>
                <p className="mk-fade-up mk-fade-up-d2 mt-8 text-base sm:text-lg text-[var(--mk-muted)] leading-[1.65] max-w-md font-light">
                  {copy.sub}
                </p>
                <div className="mk-fade-up mk-fade-up-d3 mt-10 flex flex-wrap gap-3">
                  <Link href="/signup/agency" className="mk-btn-primary">
                    {copy.ctaStart} <ArrowRight size={16} className="opacity-70" />
                  </Link>
                  <Link href="/login" className="mk-btn-ghost">
                    {copy.ctaLogin}
                  </Link>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <LiveBoard />
                <p className="mk-fade-up mk-fade-up-d4 mt-5 text-center text-[11px] text-[var(--mk-subtle)] tracking-[0.12em] uppercase">
                  Live board — holds and confirmations
                </p>
              </div>
            </div>
          </div>
        </section>

        <MarketingTicker />

        <StoryRail chapters={copy.stories} />

        <section className="mk-section-rule">
          <div className="mx-auto max-w-[72rem] px-5 sm:px-8 py-24 lg:py-32">
            <p className="mk-quote text-2xl sm:text-3xl lg:text-4xl max-w-3xl mx-auto text-center text-[var(--mk-ink)]">
              The hard part isn&apos;t the spreadsheet. It&apos;s keeping everyone aligned when the day moves.
            </p>
            <div className="mt-12 flex justify-center">
              <Link
                href="/signup/agency"
                className="inline-flex items-center gap-2 text-sm text-[var(--mk-warm)] border-b border-[var(--mk-warm)]/40 pb-0.5 hover:text-[var(--mk-ink)] hover:border-[var(--mk-ink)] transition-colors"
              >
                Start your workspace <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <RoleDock roles={copy.roles} signInLabel={copy.signIn} />

        <footer className="mk-section-rule py-10">
          <div className="mx-auto max-w-[72rem] px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--mk-muted)] tracking-wide">
            <span>&copy; {new Date().getFullYear()} LuxLane</span>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-[var(--mk-ink)] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[var(--mk-ink)] transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
