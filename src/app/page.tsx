import Link from "next/link";
import { ArrowRight, Calendar, Users, Briefcase, MessageSquare } from "lucide-react";
import { getLocale, getT } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function Home() {
  const t = await getT();
  const locale = await getLocale();

  return (
    <main className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-paper-border bg-paper/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg tracking-tight">
            LuxLane
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher current={locale} />
            <Link href="/login" className="ll-btn-ghost text-xs">
              {t("landing.cta.login")}
            </Link>
            <Link href="/signup/agency" className="ll-btn-primary text-xs">
              {t("landing.cta.start")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-paper-border">
        <div aria-hidden className="absolute inset-0 bg-grid" />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[540px] rounded-full bg-accent/10 blur-3xl pointer-events-none"
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-24">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink-subtle border border-paper-border rounded-full px-3 py-1 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {t("landing.eyebrow")}
          </div>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] tracking-tight max-w-4xl text-ink">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 text-lg text-ink-muted max-w-2xl leading-relaxed">
            {t("landing.sub")}
          </p>
          <div className="mt-10 flex items-center gap-3">
            <Link href="/signup/agency" className="ll-btn-primary">
              {t("landing.cta.start")} <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="ll-btn-secondary">
              {t("landing.cta.login")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-paper-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink-subtle mb-10">
            Built for how agencies actually work
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-paper-border">
            <Feature
              icon={<Users size={16} />}
              title={t("nav.roster")}
              body="Every model, every measurement, every document — searchable in one place."
            />
            <Feature
              icon={<Calendar size={16} />}
              title={t("nav.board")}
              body="Your killer view. 30 days at a glance. Click-to-edit holds. Conflicts caught instantly."
            />
            <Feature
              icon={<Briefcase size={16} />}
              title={t("nav.jobs")}
              body="Options 1 – 3, confirmations, per-model rates. Promote and release with one click."
            />
            <Feature
              icon={<MessageSquare size={16} />}
              title={t("nav.broadcasts")}
              body="Send a casting to 10 models, get tap-to-accept replies. No more WhatsApp groups."
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-paper-border">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-subtle">
          <span>&copy; {new Date().getFullYear()} LuxLane</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <span className="hidden sm:inline opacity-40">·</span>
            <span>{t("landing.footer.tagline")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-paper p-8 hover:bg-paper-elevated transition-colors">
      <div className="w-8 h-8 rounded-md border border-paper-border bg-paper-elevated text-ink flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-5 font-medium text-ink">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">{body}</p>
    </div>
  );
}
