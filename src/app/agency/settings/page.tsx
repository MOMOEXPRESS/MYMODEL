import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";

export default async function SettingsPage() {
  const user = await requireAgencyStaff();

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your agency profile and signup code." />
      <div className="px-8 py-8 max-w-2xl space-y-6">
        <section className="ll-card p-6">
          <h2 className="font-medium">Agency</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Name" value={user.agency.name} />
            <Row label="City" value={user.agency.city ?? "—"} />
            <Row label="Country" value={user.agency.country ?? "—"} />
            <Row label="Currency" value={user.agency.currency} />
            <Row
              label="Default commission"
              value={`${user.agency.defaultCommissionPercent}%`}
            />
          </dl>
        </section>

        <section className="ll-card p-6">
          <h2 className="font-medium">Model signup code</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Share this code (or the signup link) with models you&apos;ve signed. They can
            use it to create their account and appear on your roster.
          </p>
          <div className="mt-4 p-4 bg-paper rounded-lg border border-paper-border font-mono tracking-widest text-center text-xl">
            {user.agency.signupCode}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
