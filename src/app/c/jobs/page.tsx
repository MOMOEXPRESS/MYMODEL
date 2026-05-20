import Link from "next/link";
import { requireClient } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
export default async function ClientJobsPage() {
  const user = await requireClient();
  const clientRows = await prisma.client.findMany({
    where: { platformUserId: user.id },
    select: { id: true },
  });
  const clientIds = clientRows.map((c) => c.id);

  const jobs = await prisma.job.findMany({
    where: { clientId: { in: clientIds }, deletedAt: null },
    include: {
      agency: { select: { name: true } },
      assignments: {
        where: { status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] } },
        include: { model: { include: { user: { select: { displayName: true } } } } },
      },
    },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Bookings"
        title="Your lineups"
        subtitle="Jobs from agencies you're linked to — open a booking to approve or flag talent."
      />
      {jobs.length === 0 ? (
        <div className="ll-card p-8 text-center text-sm text-ink-muted">
          No active bookings yet. When an agency links your email and assigns you to a job, it appears
          here.
        </div>
      ) : (
        <ul className="space-y-4">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/c/jobs/${j.id}`} className="ll-card-interactive block p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-xs text-ink-subtle">{j.agency.name}</p>
                    <h2 className="font-semibold mt-0.5">{j.title}</h2>
                    <p className="text-sm text-ink-muted mt-1">
                      {j.startDate.toISOString().slice(0, 10)} → {j.endDate.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <span className="text-xs text-ink-subtle shrink-0">{j.status}</span>
                </div>
                {j.assignments.length > 0 && (
                  <p className="mt-3 text-xs text-ink-muted">
                    {j.assignments.length} model{j.assignments.length === 1 ? "" : "s"} on lineup
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
