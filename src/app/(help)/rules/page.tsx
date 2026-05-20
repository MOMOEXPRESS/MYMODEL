import Link from "next/link";
import { RULE_SECTIONS } from "@/lib/rules-content";

export const metadata = { title: "Rules · LuxLane" };

export default function RulesIndexPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">How LuxLane works</h1>
      <p className="mt-2 text-sm text-ink-muted max-w-lg">
        Plain-language rules for permissions, holds, clients, and billing. Each topic has its own
        page.
      </p>
      <ul className="mt-8 grid sm:grid-cols-2 gap-4">
        {RULE_SECTIONS.map((s) => (
          <li key={s.slug}>
            <Link href={`/rules/${s.slug}`} className="ll-card-interactive block p-5">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">{s.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
