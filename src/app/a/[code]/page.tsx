// Public agency website at /a/<signupCode>.
//
// Visible only when the agency owner flips publicSiteEnabled=true. Lists
// the agency's ACTIVE roster with the hero/book photos — a plain-text,
// high-quality talent directory. Intentionally low-key: designers and
// brands search agencies by name, not by Instagram.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

export const revalidate = 300; // 5 minutes edge cache

export default async function PublicAgencyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const agency = await prisma.agency.findUnique({
    where: { signupCode: code.toUpperCase() },
    include: {
      models: {
        where: { status: "ACTIVE" },
        include: {
          user: { select: { displayName: true } },
          portfolio: {
            where: { kind: "BOOK" },
            orderBy: { order: "asc" },
            take: 1,
          },
        },
        orderBy: { user: { displayName: "asc" } },
      },
    },
  });
  if (!agency || !agency.publicSiteEnabled) notFound();

  const byDivision = new Map<string, typeof agency.models>();
  for (const m of agency.models) {
    const list = byDivision.get(m.division) ?? [];
    list.push(m);
    byDivision.set(m.division, list);
  }

  const divisions = Array.from(byDivision.keys()).sort();

  return (
    <main className="min-h-screen">
      <header className="border-b border-paper-border">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-subtle">
              Agency
            </div>
            <h1 className="font-serif text-2xl">{agency.name}</h1>
          </div>
          <span className="text-xs text-ink-muted">
            {agency.city ?? ""} {agency.country ?? ""}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-16">
        {divisions.map((div) => (
          <section key={div}>
            <h2 className="font-serif text-xl tracking-tight mb-4">
              {div.replace("_", " ")}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {byDivision.get(div)!.map((m) => {
                const hero = m.portfolio[0];
                return (
                  <li key={m.userId} className="group">
                    <div className="aspect-[3/4] rounded-md bg-paper border border-paper-border overflow-hidden">
                      {hero ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={hero.url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-ink-subtle">
                          no photo
                        </div>
                      )}
                    </div>
                    <div className="mt-2 font-medium text-sm">{m.user.displayName}</div>
                    {(() => {
                      const meas = (m.measurements ?? {}) as Record<string, unknown>;
                      if (typeof meas.heightCm === "number") {
                        return (
                          <div className="text-xs text-ink-subtle">{meas.heightCm} cm</div>
                        );
                      }
                      return null;
                    })()}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {agency.models.length === 0 && (
          <p className="text-center text-ink-muted py-16">
            Our roster is currently private — contact {agency.name} directly.
          </p>
        )}
      </div>

      <footer className="border-t border-paper-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between text-[11px] text-ink-subtle">
          <span>
            &copy; {new Date().getFullYear()} {agency.name}
          </span>
          <Link href="/" className="hover:text-ink">
            Powered by LuxLane
          </Link>
        </div>
      </footer>
    </main>
  );
}
