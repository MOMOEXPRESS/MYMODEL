import { requireModel } from "@/lib/auth-guards";
import { PrivacySection } from "@/components/privacy-section";

export default async function ModelSettingsPage() {
  const user = await requireModel();

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
      <div className="mt-6 max-w-lg space-y-6">
        <section className="ll-card p-6 space-y-3 text-sm">
          <Row label="Name" value={user.displayName} />
          <Row label="Email" value={user.email} />
          <Row label="Phone" value={user.phone ?? "—"} />
          <Row label="Agency" value={user.agency?.name ?? "—"} />
        </section>
        <PrivacySection />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
