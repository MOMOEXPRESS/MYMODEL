import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { ClientApprovals } from "./client-approvals";

// Client-portal detail view for a single job. The client sees:
//   - Job summary
//   - Proposed / confirmed lineup (model cards)
//   - Per-model approve / flag with optional note
//   - Look board tiles (read-only)
//
// No agency chat or private booking data leaks through.

export default async function ClientJobPage({
  params,
}: {
  params: Promise<{ token: string; jobId: string }>;
}) {
  const { token, jobId } = await params;
  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    select: { id: true, name: true, agencyId: true, portalEnabled: true },
  });
  if (!client || !client.portalEnabled) notFound();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      assignments: {
        where: { status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] } },
        include: {
          model: {
            include: {
              user: { select: { displayName: true } },
              portfolio: {
                where: { kind: { in: ["BOOK", "POLAROID"] } },
                orderBy: [{ kind: "asc" }, { order: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
      outfits: { orderBy: { order: "asc" } },
    },
  });
  if (!job || job.clientId !== client.id || job.agencyId !== client.agencyId) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-8 py-6 border-b border-paper-border">
        <Link
          href={`/client/${token}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> All jobs
        </Link>
        <div className="mt-4 text-[10px] uppercase tracking-wider text-ink-subtle">
          {job.type.toLowerCase()}
        </div>
        <h1 className="font-serif text-3xl tracking-tight mt-1">{job.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span>{formatDates(job.startDate, job.endDate)}</span>
          {(job.location || job.locationCity) && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {[job.location, job.locationCity].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </header>

      <main className="px-8 py-8 space-y-8">
        {job.brief && (
          <section className="ll-card p-5">
            <h2 className="font-medium">Brief</h2>
            <p className="mt-2 text-sm whitespace-pre-wrap">{job.brief}</p>
          </section>
        )}

        <section>
          <h2 className="font-medium mb-4">Proposed lineup</h2>
          <ClientApprovals
            token={token}
            assignments={job.assignments.map((a) => ({
              id: a.id,
              status: a.status,
              imageUrl: a.model.portfolio[0]?.url ?? null,
              modelName: a.model.user.displayName,
              division: a.model.division,
              clientReaction: a.clientReaction,
              clientReactionNote: a.clientReactionNote,
            }))}
          />
        </section>

        {job.outfits.length > 0 && (
          <section>
            <h2 className="font-medium mb-4">Looks</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {job.outfits.map((o) => (
                <div
                  key={o.id}
                  className="border border-paper-border rounded-lg overflow-hidden bg-paper-elevated"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={o.imageUrl}
                    alt={o.title}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className="p-2.5 text-xs font-medium truncate">{o.title}</div>
                </div>
              ))}
            </div>
          </section>
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
