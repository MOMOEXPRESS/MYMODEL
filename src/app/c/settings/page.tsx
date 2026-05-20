import { requireClient } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { CLIENT_SUBTYPE_LABEL } from "@/lib/client-subtypes";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { updateClientProfile } from "./actions";

export default async function ClientSettingsPage() {
  const user = await requireClient();
  const profile = await prisma.clientProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <DashboardHero
        eyebrow="Profile"
        title={user.displayName}
        subtitle="Your company and how agencies see you when your account is linked."
      />
      <form action={updateClientProfile} className="ll-card p-6 max-w-lg space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-muted">Company</label>
          <input
            name="companyName"
            defaultValue={profile?.companyName ?? ""}
            className="ll-input mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-muted">Type</label>
          <select name="subtype" defaultValue={profile?.subtype ?? "BRAND"} className="ll-input mt-1">
            {Object.entries(CLIENT_SUBTYPE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
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
          <label className="text-xs font-medium text-ink-muted">Website</label>
          <input name="websiteUrl" defaultValue={profile?.websiteUrl ?? ""} className="ll-input mt-1" />
        </div>
        <button type="submit" className="ll-btn-primary">
          Save profile
        </button>
      </form>
    </div>
  );
}
