import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { InvoiceStatusControl } from "./status-control";

export default async function InvoiceDetail({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const user = await requireAgencyStaff();
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: { orderBy: { id: "asc" } },
      job: { select: { id: true, title: true } },
    },
  });
  if (!invoice || invoice.agencyId !== user.agencyId) notFound();

  const agency = user.agency;

  return (
    <div>
      <div className="px-8 pt-8">
        <Link href="/agency/invoices" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> All invoices
        </Link>
      </div>
      <PageHeader
        title={invoice.number}
        subtitle={`${invoice.clientName}${invoice.clientCompany ? ` · ${invoice.clientCompany}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="ll-btn-secondary"
            >
              <Download size={14} /> PDF
            </a>
            <InvoiceStatusControl invoiceId={invoice.id} status={invoice.status} />
          </div>
        }
      />
      <div className="px-8 pb-12">
        <div className="ll-card p-8 max-w-3xl bg-paper-elevated">
          <header className="flex items-start justify-between pb-6 border-b border-paper-border">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-ink-subtle">
                Invoice
              </div>
              <div className="font-mono text-xl mt-1">{invoice.number}</div>
              <div className="text-xs text-ink-muted mt-2">
                Issued {invoice.issuedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {invoice.dueAt &&
                  ` · Due ${invoice.dueAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              </div>
            </div>
            <div className="text-right text-xs text-ink-muted">
              <div className="font-serif text-lg text-ink">{agency.name}</div>
              {agency.legalName && <div>{agency.legalName}</div>}
              {agency.addressLine && <div>{agency.addressLine}</div>}
              {(agency.postalCode || agency.city) && (
                <div>
                  {agency.postalCode ?? ""} {agency.city ?? ""}
                </div>
              )}
              {agency.siret && <div>SIRET {agency.siret}</div>}
              {agency.vatNumber && <div>TVA {agency.vatNumber}</div>}
            </div>
          </header>

          <div className="pt-6 pb-2">
            <div className="text-[10px] uppercase tracking-widest text-ink-subtle">Bill to</div>
            <div className="mt-1 text-sm">
              <div className="font-medium">{invoice.clientName}</div>
              {invoice.clientCompany && <div>{invoice.clientCompany}</div>}
              {invoice.clientAddress && <div className="whitespace-pre-wrap">{invoice.clientAddress}</div>}
              {invoice.clientVatNumber && <div>TVA {invoice.clientVatNumber}</div>}
            </div>
            {invoice.job && (
              <div className="mt-3 text-xs text-ink-muted">
                For job: <Link href={`/agency/jobs/${invoice.job.id}`} className="underline underline-offset-4">{invoice.job.title}</Link>
              </div>
            )}
          </div>

          <table className="w-full mt-6 text-sm">
            <thead className="border-b border-paper-border text-ink-subtle text-[10px] uppercase tracking-widest">
              <tr>
                <th className="text-left font-medium py-2">Description</th>
                <th className="text-right font-medium py-2 w-20">Qty</th>
                <th className="text-right font-medium py-2 w-32">Unit</th>
                <th className="text-right font-medium py-2 w-32">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li) => (
                <tr key={li.id} className="border-b border-paper-border/60 last:border-0">
                  <td className="py-2 align-top">{li.description}</td>
                  <td className="py-2 text-right align-top">{li.quantity}</td>
                  <td className="py-2 text-right align-top">
                    {invoice.currency} {li.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-2 text-right align-top font-medium">
                    {invoice.currency} {li.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-6 ml-auto w-56 text-sm space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd>{invoice.currency} {invoice.subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">TVA ({invoice.taxRate}%)</dt>
              <dd>{invoice.currency} {invoice.taxAmount.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-paper-border font-medium">
              <dt>Total</dt>
              <dd>{invoice.currency} {invoice.total.toFixed(2)}</dd>
            </div>
          </dl>

          {invoice.notes && (
            <div className="mt-8 pt-4 border-t border-paper-border">
              <div className="text-[10px] uppercase tracking-widest text-ink-subtle mb-1">Notes</div>
              <p className="text-xs whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          <footer className="mt-8 pt-4 border-t border-paper-border text-[10px] text-ink-subtle leading-relaxed">
            <p>
              En cas de retard de paiement, pénalités au taux de 3 fois le taux d&apos;intérêt
              légal (Code de commerce, art. L. 441-10). Indemnité forfaitaire pour frais
              de recouvrement : 40 € (art. D. 441-5).
            </p>
            {(agency.iban || agency.bic) && (
              <p className="mt-2">
                Banque : IBAN {agency.iban ?? "—"} · BIC {agency.bic ?? "—"}
              </p>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}
