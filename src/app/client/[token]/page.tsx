import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";

// Public client-portal landing page. Lists the client's jobs with a quick
// summary — drill into a single job to see the proposed lineup and approve /
// flag each model. Auth is the token in the URL; no password.

export default async function ClientPortalHome({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    include: {
      agency: { select: { name: true, logoUrl: true, city: true } },
      jobs: {
        where: { deletedAt: null },
        orderBy: { startDate: "desc" },
        include: {
          assignments: { where: { status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] } } },
        },
      },
    },
  });
  if (!client || !client.portalEnabled) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-8 py-6 border-b border-paper-border">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-subtle">
          {client.agency.name}
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Welcome, {client.name}</h1>
        <p className="mt-2 text-sm text-ink-muted max-w-xl">
          Everything we&apos;ve put together for you in one place. Open a job to see the
          proposed lineup and approve or flag each model.
        </p>
      </header>

      <main className="px-8 py-8">
        <h2 className="text-[11px] uppercase tracking-wider text-ink-subtle mb-3">
          Your jobs
        </h2>
        {client.jobs.length === 0 ? (
          <div className="ll-card p-10 text-center">
            <Briefcase size={22} className="mx-auto text-ink-subtle" />
            <p className="mt-2 text-sm text-ink-muted">
              No jobs attached yet. {client.agency.name} will add them as they go.
            </p>
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {client.jobs.map((j) => (
              <li key={j.id} className="ll-card p-5 hover:-translate-y-0.5 transition-transform">
                <Link href={`/client/${token}/jobs/${j.id}`} className="block">
                  <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
                    {j.type.toLowerCase()} · {j.status.toLowerCase()}
                  </div>
                  <div className="mt-1 font-serif text-xl tracking-tight">{j.title}</div>
                  <div className="mt-2 text-xs text-ink-muted">
                    {formatDates(j.startDate, j.endDate)}
                  </div>
                  {(j.location || j.locationCity) && (
                    <div className="mt-1 text-xs text-ink-muted inline-flex items-center gap-1">
                      <MapPin size={11} />
                      {[j.location, j.locationCity].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-paper-border text-xs text-ink-muted">
                    {j.assignments.length} model{j.assignments.length === 1 ? "" : "s"} on hold
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function formatDates(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (start.getTime() === end.getTime()) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}
