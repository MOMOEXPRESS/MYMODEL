import Link from "next/link";
import { ArrowRight, Calendar, Users, Briefcase, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-paper-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl tracking-tight">
            LuxLane
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="ll-btn-ghost">
              Log in
            </Link>
            <Link href="/signup/agency" className="ll-btn-primary">
              Start your agency
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-subtle mb-6">
          The agency OS for modeling
        </p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight max-w-4xl">
          Run your roster, board and bookings in one place.
        </h1>
        <p className="mt-6 text-lg text-ink-muted max-w-2xl">
          LuxLane replaces the patchwork of spreadsheets, WhatsApp and Dropbox that
          boutique agencies run on. Manage every model, every hold, every job —
          without switching tabs.
        </p>
        <div className="mt-10 flex items-center gap-3">
          <Link href="/signup/agency" className="ll-btn-primary">
            Start your agency <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="ll-btn-secondary">
            Log in
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-paper-border bg-paper-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Feature
            icon={<Users size={18} />}
            title="Roster"
            body="Every model, every measurement, every document — searchable in one place."
          />
          <Feature
            icon={<Calendar size={18} />}
            title="The Board"
            body="Your killer view. 30 days at a glance. Click-to-edit holds. Conflicts caught instantly."
          />
          <Feature
            icon={<Briefcase size={18} />}
            title="Jobs &amp; holds"
            body="Options 1 – 3, confirmations, per-model rates. Promote and release with one click."
          />
          <Feature
            icon={<MessageSquare size={18} />}
            title="Broadcasts"
            body="Send a casting to 10 models, get tap-to-accept replies. No more WhatsApp groups."
          />
        </div>
      </section>

      <footer className="border-t border-paper-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between text-xs text-ink-subtle">
          <span>&copy; {new Date().getFullYear()} LuxLane</span>
          <span>Built for Paris. Working for everyone.</span>
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
