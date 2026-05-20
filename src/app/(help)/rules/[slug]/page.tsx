import Link from "next/link";
import { notFound } from "next/navigation";
import { ruleBySlug, RULE_SECTIONS } from "@/lib/rules-content";

export function generateStaticParams() {
  return RULE_SECTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = ruleBySlug(slug);
  return { title: section ? `${section.title} · LuxLane` : "Rules" };
}

export default async function RulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const section = ruleBySlug(slug);
  if (!section) notFound();

  return (
    <article>
      <Link href="/rules" className="text-xs text-ink-muted hover:text-ink">
        ← All rules
      </Link>
      <h1 className="mt-4 font-serif text-3xl tracking-tight">{section.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{section.summary}</p>
      <ul className="mt-8 space-y-3">
        {section.bullets.map((b) => (
          <li key={b} className="ll-card p-4 text-sm text-ink-muted leading-relaxed">
            {b}
          </li>
        ))}
      </ul>
    </article>
  );
}
