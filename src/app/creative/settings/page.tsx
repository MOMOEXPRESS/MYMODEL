import { requireCreative } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { updateCreativeProfile } from "./actions";

const SUBTYPES = [
  "PHOTOGRAPHER",
  "STYLIST",
  "MUA",
  "HAIR",
  "SET_DESIGN",
  "OTHER",
] as const;

export default async function CreativeSettingsPage() {
  const user = await requireCreative();
  const profile = await prisma.creativeProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero eyebrow="Creative" title={user.displayName} subtitle="Your discipline and portfolio link." />
      <form action={updateCreativeProfile} className="ll-card p-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Discipline</label>
          <select name="subtype" defaultValue={profile?.subtype ?? "PHOTOGRAPHER"} className="ll-input mt-1">
            {SUBTYPES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">City</label>
          <input name="city" defaultValue={profile?.city ?? ""} className="ll-input mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Bio</label>
          <textarea name="bio" defaultValue={profile?.bio ?? ""} rows={3} className="ll-input mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Portfolio URL</label>
          <input name="portfolioUrl" defaultValue={profile?.portfolioUrl ?? ""} className="ll-input mt-1" />
        </div>
        <button type="submit" className="ll-btn-primary">
          Save
        </button>
      </form>
    </div>
  );
}
