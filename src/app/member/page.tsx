import { requireMember } from "@/lib/auth-guards";
import { DashboardHero, DashboardActionCard } from "@/components/dashboard/dashboard-hero";
import { PLATFORM_NAV } from "@/lib/routing";

export default async function MemberHomePage() {
  const user = await requireMember();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Explore"
        title={user.displayName}
        subtitle="Discover people and events across fashion and modeling."
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <DashboardActionCard
          index="01"
          href={PLATFORM_NAV.network}
          title="Network"
          body="Browse and connect with the LuxLane community."
          cta="Open network"
        />
        <DashboardActionCard
          index="02"
          href={PLATFORM_NAV.events}
          title="Events"
          body="Group shoots, castings, and collaborations."
          cta="Browse events"
        />
        <DashboardActionCard
          index="03"
          href="/member/settings"
          title="Profile"
          body="City and bio for your public presence."
          cta="Edit profile"
        />
      </div>
    </div>
  );
}
