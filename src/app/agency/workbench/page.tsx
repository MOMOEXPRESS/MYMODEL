import Link from "next/link";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { DashboardHero, DashboardActionCard } from "@/components/dashboard/dashboard-hero";
import { PLATFORM_NAV } from "@/lib/routing";
import { acceptClientBrief } from "@/app/c/briefs/actions";

export default async function WorkbenchPage() {
  const user = await requireAgencyStaff();
  const role = user.agencyMembership?.role ?? null;
  const today = new Date();
  const today0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const in3 = new Date(today0.getTime() + 3 * 86400000);

  const staleCutoff = new Date(Date.now() - 48 * 3600 * 1000);

  const [openJobs, pendingResponses, recentMessages, expiringOptions, staleOptions, clientBriefs, clientFlags] =
    await Promise.all([
      prisma.job.count({
        where: {
          agencyId: user.agencyId,
          deletedAt: null,
          status: { in: ["OPEN", "CONFIRMED", "IN_PROGRESS"] },
        },
      }),
      prisma.broadcastResponse.count({
        where: { broadcast: { agencyId: user.agencyId }, response: "NO_RESPONSE" },
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false, type: "MESSAGE" },
      }),
      prisma.jobAssignment.count({
        where: {
          job: { agencyId: user.agencyId, deletedAt: null, endDate: { lte: in3 } },
          status: { in: ["OPTION_1", "OPTION_2", "OPTION_3"] },
        },
      }),
      prisma.jobAssignment.count({
        where: {
          status: "OPTION_1",
          proposedAt: { lt: staleCutoff },
          job: { agencyId: user.agencyId, deletedAt: null, startDate: { gte: today0 } },
        },
      }),
      prisma.clientBrief.findMany({
        where: { targetAgencyId: user.agencyId, status: "SUBMITTED" },
        include: { author: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.jobAssignment.count({
        where: {
          job: { agencyId: user.agencyId, deletedAt: null },
          clientReaction: "FLAG",
          status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] },
        },
      }),
    ]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl space-y-8">
      <DashboardHero
        eyebrow={user.agency.name}
        title="Workbench"
        subtitle="What needs your attention today — schedule, bookings, and client signals."
      />

      {expiringOptions > 0 && (
        <div className="ll-card border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">{expiringOptions}</strong> hold
            {expiringOptions === 1 ? "" : "s"} ending in the next 3 days.
          </p>
          <Link href="/agency/bookings" className="ll-btn-secondary text-xs shrink-0">
            Review bookings
          </Link>
        </div>
      )}

      {staleOptions > 0 && (
        <div className="ll-card border-orange-500/25 bg-orange-500/5 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">{staleOptions}</strong> first hold
            {staleOptions === 1 ? "" : "s"} unchanged for 48h+ — chase or release.
          </p>
          <Link href="/agency/schedule" className="ll-btn-secondary text-xs shrink-0">
            Open schedule
          </Link>
        </div>
      )}

      {clientFlags > 0 && (
        <div className="ll-card border-rose-500/20 bg-rose-500/5 p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">{clientFlags}</strong> client flag
            {clientFlags === 1 ? "" : "s"} on lineups — check job assignments.
          </p>
          <Link href="/agency/bookings" className="ll-btn-secondary text-xs shrink-0">
            Open bookings
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardActionCard
          href="/agency/schedule"
          title="Schedule"
          body="Who's available, on hold, or booked this week."
          cta="Open schedule"
        />
        <DashboardActionCard
          href="/agency/bookings"
          title="Bookings"
          body={`${openJobs} open or in-progress booking${openJobs === 1 ? "" : "s"}.`}
          cta="View pipeline"
        />
        <DashboardActionCard
          href="/agency/broadcasts"
          title="Casting replies"
          body={
            pendingResponses > 0
              ? `${pendingResponses} model${pendingResponses === 1 ? "" : "s"} haven't answered.`
              : "All recent blasts answered."
          }
          cta="Casting blasts"
          accent={pendingResponses > 0 ? "amber" : undefined}
        />
      </div>

      {clientBriefs.length > 0 && can(role, "job.create") && (
        <section>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <FileText size={16} className="text-accent" />
            Client briefs
          </h2>
          <ul className="mt-3 space-y-2">
            {clientBriefs.map((b) => (
              <li key={b.id} className="ll-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">From {b.author.displayName}</p>
                </div>
                <form
                  action={async (formData) => {
                    await acceptClientBrief(formData);
                  }}
                >
                  <input type="hidden" name="briefId" value={b.id} />
                  <button type="submit" className="ll-btn-primary text-xs">
                    Create booking
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        <Link href={PLATFORM_NAV.network} className="ll-btn-secondary">
          Network
        </Link>
        <Link href={PLATFORM_NAV.events} className="ll-btn-secondary">
          Events
        </Link>
        <Link href="/rules" className="ll-btn-ghost">
          Rules & help
        </Link>
      </div>

      {recentMessages > 0 && (
        <p className="text-xs text-ink-subtle">
          {recentMessages} unread message{recentMessages === 1 ? "" : "s"} —{" "}
          <Link href="/agency/messages" className="text-accent hover:underline">
            inbox
          </Link>
        </p>
      )}
    </div>
  );
}
