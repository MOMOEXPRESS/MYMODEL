// Pennylane / QuickBooks-friendly CSV export.
//
// Columns chosen so an accountant can import this into any standard accounting
// tool with minimal mapping. Matches the Pennylane "ventes/factures" import
// shape: invoice number, date, due date, client name, net, VAT, total.

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "AGENCY_STAFF" || !actor.agencyId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { agencyId: actor.agencyId },
    include: { job: { select: { title: true } } },
    orderBy: { issuedAt: "asc" },
  });

  const header = [
    "number",
    "issued_at",
    "due_at",
    "status",
    "client_name",
    "client_company",
    "client_vat",
    "currency",
    "subtotal",
    "tax_rate",
    "tax_amount",
    "total",
    "paid_at",
    "job",
  ];
  const rows = invoices.map((i) => [
    i.number,
    i.issuedAt.toISOString().slice(0, 10),
    i.dueAt?.toISOString().slice(0, 10) ?? "",
    i.status.toLowerCase(),
    i.clientName,
    i.clientCompany ?? "",
    i.clientVatNumber ?? "",
    i.currency,
    i.subtotal.toFixed(2),
    i.taxRate.toFixed(2),
    i.taxAmount.toFixed(2),
    i.total.toFixed(2),
    i.paidAt?.toISOString().slice(0, 10) ?? "",
    i.job?.title ?? "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="invoices-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
