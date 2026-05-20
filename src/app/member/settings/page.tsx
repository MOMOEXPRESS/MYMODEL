import { requireMember } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { updateMemberProfile } from "./actions";

export default async function MemberSettingsPage() {
  const user = await requireMember();
  const profile = await prisma.memberProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero eyebrow="Member" title={user.displayName} subtitle="How you show up on the network." />
      <form action={updateMemberProfile} className="ll-card p-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">City</label>
          <input name="city" defaultValue={profile?.city ?? ""} className="ll-input mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Bio</label>
          <textarea name="bio" defaultValue={profile?.bio ?? ""} rows={3} className="ll-input mt-1" />
        </div>
        <button type="submit" className="ll-btn-primary">
          Save
        </button>
      </form>
    </div>
  );
}
