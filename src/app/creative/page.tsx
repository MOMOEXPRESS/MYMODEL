import Link from "next/link";
import { requireCreative } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero, DashboardActionCard } from "@/components/dashboard/dashboard-hero";
import { PLATFORM_NAV } from "@/lib/routing";

export default async function CreativeHomePage() {
  const user = await requireCreative();
  const profile = await prisma.creativeProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Creative"
        title={user.displayName}
        subtitle={
          profile
            ? `${profile.subtype.replace("_", " ").toLowerCase()}${profile.city ? ` · ${profile.city}` : ""}`
            : "Connect, collaborate, and join group shoots."
        }
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <DashboardActionCard
          index="01"
          href={PLATFORM_NAV.network}
          title="Network"
          body="Models, brands, photographers, and agencies."
          cta="Connections"
        />
        <DashboardActionCard
          index="02"
          href={PLATFORM_NAV.events}
          title="Group events"
          body="Host or join collaborative shoots and castings."
          cta="Events"
        />
        <DashboardActionCard
          index="03"
          href="/creative/settings"
          title="Profile"
          body="Discipline, bio, and portfolio link."
          cta="Edit profile"
        />
      </div>
    </div>
  );
}
