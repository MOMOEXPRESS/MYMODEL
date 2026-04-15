import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";

export default async function AgencyHome() {
  const user = await requireAgencyStaff();

  const [modelCount, activeCount, jobCount, openJobCount] = await Promise.all([
    prisma.model.count({ where: { agencyId: user.agencyId } }),
    prisma.model.count({ where: { agencyId: user.agencyId, status: "ACTIVE" } }),
    prisma.job.count({ where: { agencyId: user.agencyId } }),
    prisma.job.count({
      where: { agencyId: user.agencyId, status: { in: ["OPEN", "CONFIRMED", "IN_PROGRESS"] } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={`Good morning, ${user.displayName.split(" ")[0]}`}
        subtitle="Your agency at a glance."
      />
      <div className="px-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Stat label="Models on roster" value={modelCount} href="/agency/roster" />
          <Stat label="Active models" value={activeCount} href="/agency/roster" />
          <Stat label="Total jobs" value={jobCount} href="/agency/jobs" />
          <Stat label="Open jobs" value={openJobCount} href="/agency/jobs" />
        </div>

        <div className="mt-8 ll-card p-6">
          <h3 className="font-medium">Sprint 0 is live.</h3>
          <p className="text-sm text-ink-muted mt-2 max-w-2xl">
            The foundation is in place: auth, tenancy, and a greenfield schema covering
            the Roster, Board, Jobs, Holds, Job Rooms, Broadcasts and Notifications. Next
            up: build the Roster and the Board.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/agency/roster" className="ll-btn-secondary">Open Roster</Link>
            <Link href="/agency/board" className="ll-btn-secondary">Open Board</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="ll-card p-5 hover:border-ink-subtle transition-colors block">
      <div className="text-xs uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className="mt-2 font-serif text-3xl tracking-tight">{value}</div>
    </Link>
  );
}
