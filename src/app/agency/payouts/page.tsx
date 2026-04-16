import Link from "next/link";
import { Banknote } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PayoutMarkPaid } from "./payout-mark-paid";
import { initials } from "@/lib/utils";

export default async function PayoutsPage() {
  const user = await requireAgencyStaff();

  const payouts = await prisma.modelPayout.findMany({
    where: { agencyId: user.agencyId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Resolve names once.
  const userIds = Array.from(new Set(payouts.map((p) => p.modelId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.displayName]));

  const pending = payouts.filter((p) => p.status === "PENDING");
  const pendingTotal = pending.reduce((s, p) => s + p.net, 0);

  return (
    <div>
      <PageHeader
        title="Payouts"
        subtitle="Net amounts owed to each model. Generated automatically when invoices are marked PAID."
      />
      <div className="px-8 pb-12 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Pending payouts" value={pending.length} />
          <Stat
            label="Owed to models"
            value={`${user.agency.currency} ${pendingTotal.toFixed(0)}`}
          />
          <Stat
            label="Paid this year"
            value={payouts
              .filter((p) => p.status === "PAID")
              .reduce((s, p) => s + p.net, 0)
              .toFixed(0)}
          />
          <Stat
            label="Stripe Connect"
            value={user.agency.stripeAccountId ? "Connected" : "Not connected"}
          />
        </div>

        {payouts.length === 0 ? (
          <EmptyState
            icon={<Banknote size={20} />}
            title="No payouts yet"
            body="When you mark an invoice as PAID, we compute each model's net (after commission) and queue a payout here."
          />
        ) : (
          <div className="ll-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-paper-border text-ink-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Model</th>
                  <th className="text-right font-medium px-5 py-3">Gross</th>
                  <th className="text-right font-medium px-5 py-3">Commission</th>
                  <th className="text-right font-medium px-5 py-3">Net</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-paper-border last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/agency/models/${p.modelId}`} className="flex items-center gap-2 hover:underline underline-offset-4">
                        <div className="w-7 h-7 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center">
                          {initials(nameById.get(p.modelId) ?? "??")}
                        </div>
                        {nameById.get(p.modelId) ?? p.modelId.slice(0, 6)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted">
                      {p.currency} {p.gross.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right text-ink-muted">
                      −{p.currency} {p.commission.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {p.currency} {p.net.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3">
                      {p.status === "PENDING" && <PayoutMarkPaid payoutId={p.id} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ll-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className="font-serif text-2xl mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "PENDING" | "PAID" | "FAILED" }) {
  const map: Record<typeof status, string> = {
    PENDING: "bg-board-option2/50 text-ink",
    PAID: "bg-board-confirmed/20 text-board-confirmed",
    FAILED: "bg-red-50 text-red-600",
  };
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md ${map[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}
