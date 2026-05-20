import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, MapPin, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";

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
          assignments: {
            where: { status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] } },
          },
        },
      },
    },
  });
  if (!client || !client.portalEnabled) notFound();

  return (
    <div className="px-6 py-10">
      <p className="ll-badge mb-4">{client.agency.name}</p>
      <h1 className="text-3xl font-semibold tracking-tight">Hi, {client.name}</h1>
      <p className="mt-3 text-sm text-ink-muted max-w-xl leading-relaxed">
        Review lineups, approve talent, and leave feedback — no account needed. Open a booking
        below to get started.
      </p>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-wider text-ink-subtle mb-4">
          Your bookings
        </h2>
        {client.jobs.length === 0 ? (
          <div className="ll-card p-12 text-center">
            <Briefcase size={22} className="mx-auto text-ink-subtle" />
            <p className="mt-3 text-sm text-ink-muted">
              Nothing here yet. {client.agency.name} will share jobs as they&apos;re ready.
            </p>
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4">
            {client.jobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/client/${token}/jobs/${j.id}`}
                  className="ll-card-interactive p-5 flex flex-col h-full group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                        {j.type.toLowerCase()} · {j.status.toLowerCase()}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight group-hover:text-accent transition-colors">
                        {j.title}
                      </h3>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-ink-subtle shrink-0 mt-1 group-hover:text-accent transition-colors"
                    />
                  </div>
                  <p className="mt-2 text-xs text-ink-muted">{formatDates(j.startDate, j.endDate)}</p>
                  {(j.location || j.locationCity) && (
                    <p className="mt-1 text-xs text-ink-muted inline-flex items-center gap-1">
                      <MapPin size={12} />
                      {[j.location, j.locationCity].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="mt-4 pt-3 border-t border-paper-border text-xs text-ink-subtle">
                    {j.assignments.length} model{j.assignments.length === 1 ? "" : "s"} on hold
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDates(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (start.toDateString() === end.toDateString()) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
