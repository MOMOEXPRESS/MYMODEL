import Link from "next/link";
import { requireClient } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero, DashboardActionCard } from "@/components/dashboard/dashboard-hero";
import { PLATFORM_NAV } from "@/lib/routing";

export default async function ClientHomePage() {
  const user = await requireClient();
  const profile = await prisma.clientProfile.findUnique({ where: { userId: user.id } });
  const [agencyCount, jobCount, pendingBriefs] = await Promise.all([
    prisma.client.count({ where: { platformUserId: user.id } }),
    prisma.job.count({
      where: {
        deletedAt: null,
        client: { platformUserId: user.id },
      },
    }),
    prisma.clientBrief.count({
      where: { authorUserId: user.id, status: "SUBMITTED" },
    }),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Client"
        title={`Welcome${profile?.companyName ? `, ${profile.companyName}` : ""}`}
        subtitle="Review lineups, send briefs to your agencies, and grow your network."
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <DashboardActionCard
          href="/c/jobs"
          title="Bookings"
          body={
            jobCount > 0
              ? `${jobCount} active booking${jobCount === 1 ? "" : "s"} to review.`
              : "Lineups appear when agencies link your email."
          }
          cta="View bookings"
        />
        <DashboardActionCard
          href="/c/briefs"
          title="Briefs"
          body={
            pendingBriefs > 0
              ? `${pendingBriefs} brief${pendingBriefs === 1 ? "" : "s"} awaiting agency.`
              : "Post castings and campaign details."
          }
          cta="Send a brief"
        />
        <DashboardActionCard
          href="/c/agencies"
          title="Agencies"
          body={`${agencyCount} linked agenc${agencyCount === 1 ? "y" : "ies"}.`}
          cta="My agencies"
        />
        <DashboardActionCard
          href={PLATFORM_NAV.network}
          title="Network"
          body="Photographers, models, MUAs, and other brands."
          cta="Explore"
        />
      </div>
    </div>
  );
}
