import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { can } from "@/lib/permissions";

const STAGES = [
  { key: "DRAFT", label: "Draft" },
  { key: "OPEN", label: "Out to models" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "IN_PROGRESS", label: "On set" },
  { key: "DONE", label: "Wrapped" },
] as const;

export default async function BookingsPage() {
  const user = await requireAgencyStaff();
  const jobs = await prisma.job.findMany({
    where: { agencyId: user.agencyId, deletedAt: null },
    include: {
      client: { select: { name: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const byStage = Object.fromEntries(STAGES.map((s) => [s.key, [] as typeof jobs]));
  for (const j of jobs) {
    const bucket = byStage[j.status as keyof typeof byStage];
    if (bucket) bucket.push(j);
    else if (j.status === "CANCELLED") {
      /* skip cancelled in pipeline */
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Bookings"
        subtitle="Every job in one pipeline — open a booking to manage lineup, production, and client."
        actions={
          can(user.agencyMembership?.role ?? null, "job.create") ? (
            <Link href="/agency/jobs/new" className="ll-btn-primary">
              <Plus size={16} /> New booking
            </Link>
          ) : null
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Briefcase size={22} />}
          title="No bookings yet"
          body="Create your first booking to attach talent and share options with clients."
          action={
            <Link href="/agency/jobs/new" className="ll-btn-primary">
              New booking
            </Link>
          }
        />
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-5 overflow-x-auto">
          {STAGES.map((stage) => (
            <section key={stage.key} className="min-w-[200px]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-3">
                {stage.label}
                <span className="ml-1.5 text-ink-subtle font-normal">
                  ({byStage[stage.key]?.length ?? 0})
                </span>
              </h2>
              <ul className="space-y-2">
                {(byStage[stage.key] ?? []).map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/agency/bookings/${j.id}`}
                      className="ll-card-interactive block p-3"
                    >
                      <p className="font-medium text-sm leading-snug">{j.title}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {j.client?.name ?? "No client"} · {j._count.assignments} on lineup
                      </p>
                      <p className="mt-1 text-[10px] text-ink-subtle uppercase tracking-wide">
                        {j.type.toLowerCase()}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
