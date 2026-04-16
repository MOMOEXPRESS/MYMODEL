import Link from "next/link";
import { requireModel } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { Banknote, Download } from "lucide-react";

export default async function ModelEarnings() {
  const user = await requireModel();

  const payouts = await prisma.modelPayout.findMany({
    where: { modelId: user.id },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
  // Batch-resolve invoice numbers.
  const invoiceIds = payouts.map((p) => p.invoiceId).filter((v): v is string => Boolean(v));
  const invoices = invoiceIds.length
    ? await prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, number: true },
      })
    : [];
  const numberByInvoice = new Map(invoices.map((i) => [i.id, i.number]));

  const pending = payouts.filter((p) => p.status === "PENDING");
  const pendingTotal = pending.reduce((s, p) => s + p.net, 0);
  const paidTotal = payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.net, 0);

  const currency = user.agency?.currency ?? "EUR";
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Earnings</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Net amounts your agency has recorded for you.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="ll-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">Pending</div>
          <div className="font-serif text-2xl mt-1">
            {currency} {pendingTotal.toFixed(0)}
          </div>
        </div>
        <div className="ll-card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-subtle">Paid YTD</div>
          <div className="font-serif text-2xl mt-1">
            {currency} {paidTotal.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <a
          href={`/api/earnings/${user.id}/pdf?year=${year}&month=${month}`}
          target="_blank"
          rel="noreferrer"
          className="ll-btn-secondary text-xs"
        >
          <Download size={13} /> Download this month&apos;s statement
        </a>
      </div>

      <div className="mt-8">
        {payouts.length === 0 ? (
          <EmptyState
            icon={<Banknote size={20} />}
            title="No payouts yet"
            body="Once your agency marks an invoice as paid, your net share appears here."
          />
        ) : (
          <ul className="ll-card divide-y divide-paper-border">
            {payouts.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {currency} {p.net.toFixed(2)}
                    <span className="text-ink-subtle text-xs ml-2">
                      ({currency} {p.gross.toFixed(0)} − {currency} {p.commission.toFixed(0)} commission)
                    </span>
                  </div>
                  <div className="text-xs text-ink-muted">
                    {(p.invoiceId && numberByInvoice.get(p.invoiceId)) ?? "Direct"} ·{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <span
                  className={
                    p.status === "PAID"
                      ? "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-board-confirmed/20 text-board-confirmed"
                      : "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-board-option2/50 text-ink"
                  }
                >
                  {p.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
