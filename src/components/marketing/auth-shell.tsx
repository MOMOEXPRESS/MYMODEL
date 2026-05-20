import Link from "next/link";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const showDemoHint = process.env.NODE_ENV === "development";

  return (
    <div className="marketing-root min-h-screen grid lg:grid-cols-2 overflow-hidden">
      <div className="mk-backdrop" aria-hidden>
        <div className="mk-vignette" />
      </div>
      <div aria-hidden className="mk-grain" />

      <div className="relative z-10 hidden lg:flex flex-col justify-between p-12 xl:p-16 border-r border-[var(--mk-line)]">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mk-line)] text-[11px] font-medium tracking-widest text-[var(--mk-ink)] transition-colors group-hover:border-[var(--mk-warm)]">
            LL
          </span>
          <span className="text-sm font-medium tracking-tight text-[var(--mk-ink)]">LuxLane</span>
        </Link>
        <div className="max-w-md space-y-8">
          {title ? (
            <h1 className="mk-display text-4xl xl:text-5xl leading-[1.05] text-[var(--mk-ink)]">{title}</h1>
          ) : (
            <h1 className="mk-display text-4xl xl:text-5xl leading-[1.05] text-[var(--mk-ink)]">
              Backstage,
              <span className="block text-[var(--mk-muted)] mt-2">organized.</span>
            </h1>
          )}
          <p className="text-sm text-[var(--mk-muted)] leading-[1.7] max-w-sm">
            {subtitle ??
              "Sign in to your agency, model, client, or creative workspace. Same network, one rhythm."}
          </p>
          {showDemoHint ? (
            <div className="rounded-xl border border-[var(--mk-line)] bg-white/[0.02] p-4 text-xs text-[var(--mk-muted)] space-y-1">
              <p className="text-[var(--mk-ink)] font-medium tracking-wide">Demo credentials</p>
              <p className="font-mono text-[11px]">owner@mademoiselle.demo</p>
              <p className="font-mono text-[11px]">Password: luxlane-demo</p>
            </div>
          ) : null}
        </div>
        <p className="text-[11px] text-[var(--mk-subtle)] tracking-wide">
          &copy; {new Date().getFullYear()} LuxLane
        </p>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen lg:min-h-0">
        <div className="lg:hidden flex items-center justify-between p-5 border-b border-[var(--mk-line)]">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--mk-line)] text-[10px] font-medium tracking-widest">
              LL
            </span>
            <span className="text-sm font-medium text-[var(--mk-ink)]">LuxLane</span>
          </Link>
          <Link href="/" className="text-xs text-[var(--mk-muted)] hover:text-[var(--mk-ink)] transition-colors">
            Home
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[400px] mk-fade-up">{children}</div>
        </div>
      </div>
    </div>
  );
}
