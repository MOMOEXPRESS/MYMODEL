import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { RULE_SECTIONS } from "@/lib/rules-content";

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-paper-border bg-paper-elevated sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <AppLogo href="/" />
          <Link href="/login" className="ll-btn-ghost text-xs">
            Sign in
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl w-full flex-1 flex flex-col sm:flex-row gap-0 sm:gap-8 px-6 py-8">
        <aside className="sm:w-52 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-3">
            Rules
          </p>
          <nav className="space-y-0.5">
            <Link href="/rules" className="block text-sm py-1.5 text-ink-muted hover:text-ink">
              Overview
            </Link>
            {RULE_SECTIONS.map((s) => (
              <Link
                key={s.slug}
                href={`/rules/${s.slug}`}
                className="block text-sm py-1.5 text-ink-muted hover:text-ink"
              >
                {s.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-w-0 pb-12">{children}</main>
      </div>
    </div>
  );
}
