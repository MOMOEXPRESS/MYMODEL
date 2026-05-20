import Link from "next/link";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/editorial/section-label";

export function DashboardHero({
  eyebrow,
  eyebrowIndex = "00",
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  eyebrowIndex?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-paper-border", className)}>
      <div className="py-8 lg:py-10">
        {eyebrow && <SectionLabel index={eyebrowIndex}>{eyebrow}</SectionLabel>}
        <h1 className="mt-4 font-serif text-2xl sm:text-3xl lg:text-[2.15rem] tracking-tight text-ink leading-[1.08]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-sm text-ink-muted leading-[1.65] font-light">{subtitle}</p>
        )}
      </div>
    </header>
  );
}

export function DashboardActionCard({
  href,
  index,
  title,
  body,
  cta,
}: {
  href: string;
  index: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link href={href} className="ll-card-interactive group block p-5 h-full">
      <span className="font-mono text-[10px] uppercase tracking-editorial text-editorial-warm/80 tabular-nums">
        {index}
      </span>
      <h2 className="mt-3 font-serif text-lg tracking-tight text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted leading-[1.65] font-light">{body}</p>
      <span className="mt-6 inline-block font-mono text-[10px] uppercase tracking-editorial text-ink-subtle group-hover:text-editorial-warm transition-colors">
        {cta} →
      </span>
    </Link>
  );
}

export function DashboardSection({
  index,
  title,
  children,
  className,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <SectionLabel index={index}>{title}</SectionLabel>
      <div className="mt-5">{children}</div>
    </section>
  );
}
