import Link from "next/link";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";

export default async function MoneyPage() {
  const user = await requireAgencyStaff();
  const [overdue, openInvoices, pendingPayouts] = await Promise.all([
    prisma.invoice.count({
      where: { agencyId: user.agencyId, status: "OVERDUE", deletedAt: null },
    }),
    prisma.invoice.count({
      where: { agencyId: user.agencyId, status: "SENT", deletedAt: null },
    }),
    prisma.modelPayout.count({
      where: { agencyId: user.agencyId, status: "PENDING" },
    }),
  ]);

  const cards = [
    { label: "Overdue invoices", value: overdue, href: "/agency/invoices?status=OVERDUE" },
    { label: "Sent (awaiting payment)", value: openInvoices, href: "/agency/invoices" },
    { label: "Pending payouts", value: pendingPayouts, href: "/agency/payouts" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <DashboardHero
        eyebrow="Accounts"
        title="Money"
        subtitle="Invoices, payouts, and contracts at a glance."
      />
      <ul className="mt-8 grid sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="ll-stat hover:border-accent/30 transition-colors">
              <span className="ll-stat-label">{c.label}</span>
              <span className="ll-stat-value">{c.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/agency/invoices" className="ll-btn-secondary text-sm">
          Invoices
        </Link>
        <Link href="/agency/payouts" className="ll-btn-secondary text-sm">
          Payouts
        </Link>
        <Link href="/agency/contracts" className="ll-btn-secondary text-sm">
          Contracts
        </Link>
      </div>
    </div>
  );
}
