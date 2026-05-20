import Link from "next/link";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";

export default async function ProductionHomePage() {
  const user = await requireAgencyStaff();
  const jobs = await prisma.job.findMany({
    where: {
      agencyId: user.agencyId,
      deletedAt: null,
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
    },
    orderBy: { startDate: "asc" },
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="p-6 lg:p-8">
      <DashboardHero
        eyebrow="Production"
        title="Live productions"
        subtitle="Confirmed and on-set bookings — open a job for room, travel, and call sheets."
      />
      <ul className="mt-8 space-y-3">
        {jobs.length === 0 ? (
          <li className="ll-card p-8 text-center text-sm text-ink-muted">No live jobs right now.</li>
        ) : (
          jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/agency/bookings/${j.id}`} className="ll-card-interactive block p-4">
                <p className="font-semibold">{j.title}</p>
                <p className="text-xs text-ink-muted mt-1">
                  {j.status.replace("_", " ").toLowerCase()} · {j._count.assignments} on lineup
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
