import Link from "next/link";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import { PLATFORM_NAV } from "@/lib/routing";

const LINKS = [
  { href: "/agency/packages", label: "Talent packages", gate: "package.create" as const },
  { href: "/agency/pitch", label: "Pitch decks" },
  { href: "/agency/invoices", label: "Invoices", gate: "invoice.create" as const },
  { href: "/agency/payouts", label: "Payouts", gate: "payout.mark_paid" as const },
  { href: "/agency/contracts", label: "Contracts", gate: "contract.create" as const },
  { href: "/agency/analytics", label: "Reports", gate: "analytics.view" as const },
  { href: "/agency/compliance", label: "Compliance", gate: "compliance.view" as const },
  { href: "/agency/activity", label: "Activity log", gate: "activity.view" as const },
  { href: "/agency/billing", label: "Subscription", gate: "agency.billing" as const },
  { href: "/agency/trash", label: "Trash", gate: "job.delete" as const },
  { href: "/agency/settings", label: "Settings" },
];

export default async function MorePage() {
  const user = await requireAgencyStaff();
  const role = user.agencyMembership?.role ?? null;

  return (
    <div className="p-6 lg:p-8 max-w-lg">
      <PageHeader title="More" subtitle="Finance, insights, and workspace settings." />
      <ul className="mt-8 space-y-1">
        {LINKS.filter((l) => !l.gate || can(role, l.gate)).map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium hover:bg-paper-hover"
            >
              {l.label}
              <span className="text-ink-subtle">→</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 pt-6 border-t border-paper-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-3">
          Platform
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={PLATFORM_NAV.network} className="ll-btn-secondary text-xs">
            Network
          </Link>
          <Link href={PLATFORM_NAV.events} className="ll-btn-secondary text-xs">
            Group events
          </Link>
        </div>
      </div>
    </div>
  );
}
