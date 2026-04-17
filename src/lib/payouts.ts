// Model payout computation.
//
// When an invoice is marked PAID, create a ModelPayout row for every model
// line on the invoice, applying the agency's commission (or the model's
// override). Status starts as PENDING — flipping it to PAID is a manual or
// Stripe-transfer action.

import { prisma } from "./db";

/**
 * Generate pending payouts from a paid invoice. Idempotent — a second call
 * on the same invoice is a no-op.
 */
export async function generatePayoutsForInvoice(invoiceId: string): Promise<number> {
  const existing = await prisma.modelPayout.count({ where: { invoiceId } });
  if (existing > 0) return 0;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lineItems: true, agency: true },
  });
  if (!invoice) return 0;

  const modelLines = invoice.lineItems.filter((li) => li.modelId);
  if (modelLines.length === 0) return 0;

  // Per-model commission + mother-agency split resolution.
  const modelIds = Array.from(new Set(modelLines.map((li) => li.modelId!)));
  const models = await prisma.model.findMany({
    where: { userId: { in: modelIds } },
    select: {
      userId: true,
      commissionPercent: true,
      motherAgencyName: true,
      motherAgencyCommissionPercent: true,
    },
  });
  const infoByModel = new Map(models.map((m) => [m.userId, m]));

  let created = 0;
  for (const li of modelLines) {
    const m = infoByModel.get(li.modelId!);
    const commissionPct = m?.commissionPercent ?? invoice.agency.defaultCommissionPercent;
    const gross = li.total;
    const commission = gross * (commissionPct / 100);
    // Mother-agency referral split comes out of the model's net.
    const motherPct = m?.motherAgencyCommissionPercent ?? 0;
    const motherCut = (gross - commission) * (motherPct / 100);
    const net = gross - commission - motherCut;
    const note = motherCut > 0 && m?.motherAgencyName
      ? `Mother-agency split ${motherPct}% to ${m.motherAgencyName}: ${motherCut.toFixed(2)} ${invoice.currency}`
      : null;
    await prisma.modelPayout.create({
      data: {
        agencyId: invoice.agencyId,
        modelId: li.modelId!,
        jobId: invoice.jobId,
        invoiceId: invoice.id,
        gross,
        commission,
        net,
        currency: invoice.currency,
        note,
      },
    });
    created++;
  }
  return created;
}
