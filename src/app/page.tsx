import Link from "next/link";
import { ArrowRight, Calendar, Users, Briefcase, MessageSquare } from "lucide-react";
import { getLocale, getT } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function Home() {
  const t = await getT();
  const locale = await getLocale();

  return (
    <main className="min-h-screen">
      <header className="border-b border-paper-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl tracking-tight">
            LuxLane
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher current={locale} />
            <Link href="/login" className="ll-btn-ghost">
              {t("landing.cta.login")}
            </Link>
            <Link href="/signup/agency" className="ll-btn-primary">
              {t("landing.cta.start")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r from-accent via-accent/70 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-accent-soft/30 via-transparent to-transparent"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-subtle mb-6">
            {t("landing.eyebrow")}
          </p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight max-w-4xl">
            {t("landing.headline")}
          </h1>
          <p className="mt-6 text-lg text-ink-muted max-w-2xl">{t("landing.sub")}</p>
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

      <section className="border-t border-paper-border bg-paper-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Feature
            icon={<Users size={18} />}
            title={t("nav.roster")}
            body="Every model, every measurement, every document — searchable in one place."
          />
          <Feature
            icon={<Calendar size={18} />}
            title={t("nav.board")}
            body="Your killer view. 30 days at a glance. Click-to-edit holds. Conflicts caught instantly."
          />
          <Feature
            icon={<Briefcase size={18} />}
            title={t("nav.jobs")}
            body="Options 1 – 3, confirmations, per-model rates. Promote and release with one click."
          />
          <Feature
            icon={<MessageSquare size={18} />}
            title={t("nav.broadcasts")}
            body="Send a casting to 10 models, get tap-to-accept replies. No more WhatsApp groups."
          />
        </div>
      </section>

      <footer className="border-t border-paper-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between text-xs text-ink-subtle">
          <span>&copy; {new Date().getFullYear()} LuxLane</span>
          <span>{t("landing.footer.tagline")}</span>
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
    <div className="ll-card p-6">
      <div className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-medium">{title}</h3>
      <p className="mt-2 text-sm text-ink-muted leading-relaxed">{body}</p>
    </div>
  );
}
