import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedNumber } from "./animated-number";

export type Breadcrumb = { href: string; label: string };

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  actions,
  stats,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  stats?: { label: string; value: string | number }[];
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-paper-border bg-paper-elevated/60">
      <div className="px-6 lg:px-8 py-8 lg:py-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-xs text-ink-subtle mb-5 tracking-wide"
          >
            {breadcrumbs.map((b, i) => (
              <div key={b.href + i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="opacity-40" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="text-ink-muted">{b.label}</span>
                ) : (
                  <Link href={b.href} className="hover:text-ink transition-colors">
                    {b.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-2xl">
            {eyebrow ? (
              <p className="ll-index-label mb-4">
                <span className="text-editorial-warm/70">//</span> {eyebrow}
              </p>
            ) : null}
            <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-ink leading-[1.1]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-3 text-sm text-ink-muted leading-[1.65] max-w-xl">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {stats && stats.length > 0 ? (
          <dl className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="ll-stat">
                <dt className="ll-stat-label">{s.label}</dt>
                <dd className="ll-stat-value">
                  <StatValue value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </header>
  );
}

function StatValue({ value }: { value: string | number }) {
  if (typeof value === "number") return <AnimatedNumber value={value} />;
  return <>{value}</>;
}
