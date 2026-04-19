import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedNumber } from "./animated-number";

export type Breadcrumb = { href: string; label: string };

/**
 * PageHeader — the "filled" top-of-page band used across every route.
 *
 * Carries an accent stripe, an accent-tinted wash, optional breadcrumbs,
 * eyebrow kicker, title, subtitle, actions, and an optional stats strip.
 * Reads as branded rather than blank.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  actions,
  stats,
  children,
}: {
  /** Small uppercase kicker above the title — e.g. "Agency · Paris". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  /** Small KPI strip rendered to the right of the title or below. */
  stats?: { label: string; value: string | number }[];
  /** Optional extra content (filters, tabs) rendered below the band. */
  children?: ReactNode;
}) {
  return (
    <header className="relative border-b border-paper-border overflow-hidden bg-paper">
      {/* Hairline accent stripe */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent/60 via-ink/20 to-transparent"
      />
      {/* Subtle radial glow + grid — gives the band shape without being loud */}
      <div
        aria-hidden
        className="absolute inset-0 bg-grid opacity-60"
      />
      <div
        aria-hidden
        className="absolute -top-24 left-1/3 w-[560px] h-[320px] rounded-full bg-accent/10 blur-3xl pointer-events-none"
      />
      <div className="relative px-8 pt-10 pb-7">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-xs text-ink-subtle mb-4"
          >
            {breadcrumbs.map((b, i) => (
              <div key={b.href + i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="opacity-60" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-ink-muted">{b.label}</span>
                ) : (
                  <Link href={b.href} className="hover:text-ink">
                    {b.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        )}

        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-subtle mb-1.5">
                {eyebrow}
              </p>
            )}
            <h1 className="font-serif text-4xl tracking-tight leading-[1.05]">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-ink-muted max-w-2xl">{subtitle}</p>
            )}
          </div>

          {stats && stats.length > 0 && !actions && (
            <dl className="flex items-end gap-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[10px] uppercase tracking-wider text-ink-subtle">
                    {s.label}
                  </dt>
                  <dd className="font-serif text-2xl tracking-tight leading-none mt-1 tabular-nums">
                    <StatValue value={s.value} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>

        {stats && stats.length > 0 && actions && (
          <dl className="mt-5 flex flex-wrap gap-6 pt-4 border-t border-paper-border/60">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[10px] uppercase tracking-wider text-ink-subtle">
                  {s.label}
                </dt>
                <dd className="font-serif text-xl tracking-tight leading-none mt-1 tabular-nums">
                  <StatValue value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}

function StatValue({ value }: { value: string | number }) {
  if (typeof value === "number") return <AnimatedNumber value={value} />;
  return <>{value}</>;
}
