import { cn } from "@/lib/utils";

export function DashboardHero({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-paper-border p-6 sm:p-8 bg-paper-elevated",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-glow-radial" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-glow-accent opacity-60" />
      {eyebrow && <p className="relative ll-eyebrow text-editorial-warm">{eyebrow}</p>}
      <h1 className="relative mt-2 font-serif text-2xl sm:text-3xl lg:text-[2rem] tracking-tight text-ink leading-[1.1]">
        {title}
      </h1>
      {subtitle && (
        <p className="relative mt-3 max-w-xl text-sm text-ink-muted leading-[1.65]">{subtitle}</p>
      )}
    </div>
  );
}

export function DashboardActionCard({
  href,
  title,
  body,
  cta,
  accent,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
  accent?: "amber" | "accent" | "emerald";
}) {
  const ring =
    accent === "amber"
      ? "hover:border-warning/30"
      : accent === "emerald"
        ? "hover:border-success/30"
        : "hover:border-accent/25";
  return (
    <a href={href} className={cn("ll-card-interactive block p-5 h-full", ring)}>
      <h2 className="font-medium text-ink tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-ink-muted leading-[1.65]">{body}</p>
      <span className="mt-5 inline-block text-xs font-medium text-ink-subtle tracking-wide group-hover:text-accent transition-colors">
        {cta} →
      </span>
    </a>
  );
}
