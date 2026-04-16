import Link from "next/link";
import { Plus, Download, Receipt } from "lucide-react";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireAgencyStaff();
  const sp = await searchParams;
  const status = Object.values(InvoiceStatus).includes(sp.status as InvoiceStatus)
    ? (sp.status as InvoiceStatus)
    : undefined;

  const where: Prisma.InvoiceWhereInput = {
    agencyId: user.agencyId,
    ...(status ? { status } : {}),
  };
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    include: { job: { select: { title: true } } },
  });

  const totals = await prisma.invoice.groupBy({
    by: ["status"],
    where: { agencyId: user.agencyId },
    _sum: { total: true },
    _count: { _all: true },
  });

  const lookup = new Map(totals.map((t) => [t.status, t]));
  const outstanding = (lookup.get("SENT")?._sum.total ?? 0) + (lookup.get("OVERDUE")?._sum.total ?? 0);
  const paid = lookup.get("PAID")?._sum.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"} in total`}
        actions={
          <div className="flex items-center gap-2">
            <a href="/api/invoices/export.csv" className="ll-btn-secondary">
              <Download size={14} /> CSV
            </a>
            <Link href="/agency/invoices/new" className="ll-btn-primary">
              <Plus size={14} /> New invoice
            </Link>
          </div>
        }
      />
      <div className="px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Outstanding" value={`${user.agency.currency} ${outstanding.toFixed(0)}`} />
        <Stat label="Paid" value={`${user.agency.currency} ${paid.toFixed(0)}`} />
        <Stat label="Sent" value={lookup.get("SENT")?._count._all ?? 0} />
        <Stat label="Overdue" value={lookup.get("OVERDUE")?._count._all ?? 0} tone="text-red-600" />
      </div>

      <div className="px-8 pb-12">
        {invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt size={20} />}
            title="No invoices yet"
            body="Generate an invoice from a Confirmed job — all models on the job become line items automatically."
            action={
              <Link href="/agency/invoices/new" className="ll-btn-primary">
                <Plus size={14} /> New invoice
              </Link>
            }
          />
        ) : (
          <div className="ll-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-paper-border text-ink-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Number</th>
                  <th className="text-left font-medium px-5 py-3">Client</th>
                  <th className="text-left font-medium px-5 py-3">Job</th>
                  <th className="text-left font-medium px-5 py-3">Issued</th>
                  <th className="text-right font-medium px-5 py-3">Total</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id} className="border-b border-paper-border last:border-0 hover:bg-paper/50">
                    <td className="px-5 py-3">
                      <Link href={`/agency/invoices/${i.id}`} className="font-mono text-xs hover:underline underline-offset-4">
                        {i.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div>{i.clientName}</div>
                      {i.clientCompany && (
                        <div className="text-xs text-ink-muted">{i.clientCompany}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{i.job?.title ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      {i.issuedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {i.currency} {i.total.toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={i.status} />
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

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="ll-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className={`font-serif text-2xl tracking-tight mt-1 ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, string> = {
    DRAFT: "bg-paper-border/60 text-ink-muted",
    SENT: "bg-board-option2/50 text-ink",
    PAID: "bg-board-confirmed/20 text-board-confirmed",
    OVERDUE: "bg-red-50 text-red-600",
    CANCELLED: "bg-paper-border/40 text-ink-subtle line-through",
  };
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md ${map[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}
