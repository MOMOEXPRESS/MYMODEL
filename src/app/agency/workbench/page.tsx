import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import {
  DashboardHero,
  DashboardActionCard,
  DashboardSection,
} from "@/components/dashboard/dashboard-hero";
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
    <div className="max-w-5xl">
      <div className="px-6 lg:px-8">
        <DashboardHero
          eyebrow={user.agency.name}
          eyebrowIndex="00"
          title="Workbench"
          subtitle="What needs your attention today — schedule, bookings, talent, and the wider network."
        />
      </div>

      <div className="px-6 lg:px-8 pb-12 space-y-10">
        {expiringOptions > 0 && (
          <div className="ll-card border-editorial-warm/25 bg-editorial-warm/[0.04] p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">
              <strong className="text-ink font-normal">{expiringOptions}</strong> hold
              {expiringOptions === 1 ? "" : "s"} ending in the next 3 days.
            </p>
            <Link href="/agency/bookings" className="ll-btn-secondary text-xs shrink-0">
              Review bookings
            </Link>
          </div>
        )}

        {staleOptions > 0 && (
          <div className="ll-card border-editorial-warm/20 bg-paper-muted p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">
              <strong className="text-ink font-normal">{staleOptions}</strong> first hold
              {staleOptions === 1 ? "" : "s"} unchanged for 48h+ — chase or release.
            </p>
            <Link href="/agency/schedule" className="ll-btn-secondary text-xs shrink-0">
              Open schedule
            </Link>
          </div>
        )}

        {clientFlags > 0 && (
          <div className="ll-card border-editorial-rose/30 bg-editorial-rose/[0.06] p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">
              <strong className="text-ink font-normal">{clientFlags}</strong> client flag
              {clientFlags === 1 ? "" : "s"} on lineups.
            </p>
            <Link href="/agency/bookings" className="ll-btn-secondary text-xs shrink-0">
              Open bookings
            </Link>
          </div>
        )}

        <DashboardSection index="01" title="Operations">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardActionCard
              index="01"
              href="/agency/schedule"
              title="Schedule"
              body="Who's available, on hold, or booked this week."
              cta="Open schedule"
            />
            <DashboardActionCard
              index="02"
              href="/agency/bookings"
              title="Bookings"
              body={`${openJobs} open or in-progress booking${openJobs === 1 ? "" : "s"}.`}
              cta="View pipeline"
            />
            <DashboardActionCard
              index="03"
              href="/agency/talent"
              title="Talent"
              body="Roster, portfolios, and model profiles."
              cta="Open roster"
            />
            <DashboardActionCard
              index="04"
              href={PLATFORM_NAV.network}
              title="Network"
              body="Agencies, creatives, and connections across LuxLane."
              cta="Browse network"
            />
            <DashboardActionCard
              index="05"
              href={PLATFORM_NAV.events}
              title="Events"
              body="Open castings, parties, and industry gatherings."
              cta="See events"
            />
            <DashboardActionCard
              index="06"
              href="/agency/broadcasts"
              title="Casting replies"
              body={
                pendingResponses > 0
                  ? `${pendingResponses} model${pendingResponses === 1 ? "" : "s"} haven't answered.`
                  : "All recent blasts answered."
              }
              cta="Casting blasts"
            />
          </div>
        </DashboardSection>

        {clientBriefs.length > 0 && can(role, "job.create") && (
          <DashboardSection index="02" title="Client briefs">
            <ul className="space-y-2">
              {clientBriefs.map((b) => (
                <li
                  key={b.id}
                  className="ll-card p-4 flex flex-wrap items-center justify-between gap-3 border-paper-border"
                >
                  <div>
                    <p className="font-medium text-sm">{b.title}</p>
                    <p className="text-xs text-ink-muted mt-0.5 font-light">
                      From {b.author.displayName}
                    </p>
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
          </DashboardSection>
        )}

        <DashboardSection index="03" title="Quick links">
          <div className="flex flex-wrap gap-2">
            <Link href="/agency/clients" className="ll-btn-secondary text-xs">
              Clients
            </Link>
            <Link href="/agency/prospects" className="ll-btn-secondary text-xs">
              New faces
            </Link>
            <Link href="/rules" className="ll-btn-ghost text-xs">
              Rules & help
            </Link>
          </div>
        </DashboardSection>

        {recentMessages > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-subtle">
            {recentMessages} unread message{recentMessages === 1 ? "" : "s"} —{" "}
            <Link href="/agency/messages" className="text-editorial-warm hover:text-ink transition-colors">
              inbox
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
