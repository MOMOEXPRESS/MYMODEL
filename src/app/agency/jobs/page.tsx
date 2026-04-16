import Link from "next/link";
import { Prisma, JobStatus } from "@prisma/client";
import { Briefcase, Plus } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { JobStatusFilter } from "./job-status-filter";

const STATUSES: JobStatus[] = [
  "DRAFT",
  "OPEN",
  "CONFIRMED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireAgencyStaff();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as JobStatus)
    ? (sp.status as JobStatus)
    : undefined;

  const where: Prisma.JobWhereInput = {
    agencyId: user.agencyId,
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  const [jobs, counts] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        _count: { select: { assignments: true } },
        contacts: { where: { role: "CLIENT" }, take: 1 },
      },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.job.groupBy({
      by: ["status"],
      where: { agencyId: user.agencyId, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));
  const totalCount = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${totalCount} ${totalCount === 1 ? "job" : "jobs"} in total.`}
        actions={
          <Link href="/agency/jobs/new" className="ll-btn-primary">
            <Plus size={14} /> New job
          </Link>
        }
      />

      <div className="px-8 py-5">
        <JobStatusFilter current={status} countMap={Object.fromEntries(countMap)} />
      </div>

      <div className="px-8 pb-12">
        {jobs.length === 0 ? (
          totalCount === 0 ? (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="No jobs yet"
              body="Create your first job to start attaching models, sending options, and filling the Board."
              action={
                <Link href="/agency/jobs/new" className="ll-btn-primary">
                  <Plus size={14} /> New job
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={<Briefcase size={20} />}
              title="No jobs match"
              body="Try clearing the status filter."
            />
          )
        ) : (
          <>
            {/* Desktop / tablet: table */}
            <div className="ll-card overflow-hidden hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-paper border-b border-paper-border text-ink-subtle text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Job</th>
                    <th className="text-left font-medium px-5 py-3">Type</th>
                    <th className="text-left font-medium px-5 py-3">Dates</th>
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-right font-medium px-5 py-3">Models</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-paper-border last:border-0 hover:bg-paper/50">
                      <td className="px-5 py-3">
                        <Link href={`/agency/jobs/${j.id}`} className="block group">
                          <div className="font-medium group-hover:underline underline-offset-4">{j.title}</div>
                          {j.contacts[0] ? (
                            <div className="text-xs text-ink-subtle mt-0.5">
                              {j.contacts[0].company ?? j.contacts[0].name}
                            </div>
                          ) : null}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-ink-muted text-xs uppercase tracking-wider">
                        {j.type}
                      </td>
                      <td className="px-5 py-3 text-ink-muted">{formatDates(j.startDate, j.endDate)}</td>
                      <td className="px-5 py-3">
                        <JobStatusBadge status={j.status} />
                      </td>
                      <td className="px-5 py-3 text-right text-ink-muted">
                        {j._count.assignments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list */}
            <ul className="md:hidden space-y-3">
              {jobs.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/agency/jobs/${j.id}`}
                    className="ll-card p-4 block hover:border-ink-subtle"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{j.title}</div>
                        {j.contacts[0] && (
                          <div className="text-xs text-ink-subtle mt-0.5 truncate">
                            {j.contacts[0].company ?? j.contacts[0].name}
                          </div>
                        )}
                      </div>
                      <JobStatusBadge status={j.status} />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-ink-muted">
                      <span>{j.type.toLowerCase()}</span>
                      <span>·</span>
                      <span>{formatDates(j.startDate, j.endDate)}</span>
                      <span>·</span>
                      <span>{j._count.assignments} models</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function formatDates(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (start.getTime() === end.getTime()) return fmt(start);
  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  if (sameMonth) {
    return `${fmt(start)}–${end.getUTCDate()}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-paper-border/60 text-ink-muted",
    OPEN: "bg-board-option2/40 text-ink",
    CONFIRMED: "bg-board-confirmed/20 text-board-confirmed",
    IN_PROGRESS: "bg-board-onJob/20 text-board-onJob",
    DONE: "bg-paper-border/60 text-ink-muted",
    CANCELLED: "bg-paper-border/60 text-ink-subtle line-through",
  };
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md ${colors[status] ?? ""}`}
    >
      {String(status).replace("_", " ").toLowerCase()}
    </span>
  );
}
