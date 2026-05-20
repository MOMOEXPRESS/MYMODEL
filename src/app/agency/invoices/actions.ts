"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { InvoiceStatus, Prisma } from "@prisma/client";
import { requireCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";
import { requirePlanFeature, planError } from "@/lib/plan-guard";
import { generatePayoutsForInvoice } from "@/lib/payouts";
import { logEvent } from "@/lib/audit";

async function nextInvoiceNumber(agencyId: string): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.invoice.findFirst({
    where: { agencyId, number: { startsWith: `FAC-${year}-` } },
    orderBy: { number: "desc" },
  });
  const n = last ? parseInt(last.number.split("-")[2] ?? "0", 10) + 1 : 1;
  return `FAC-${year}-${String(n).padStart(4, "0")}`;
}

const createSchema = z.object({
  jobId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  clientName: z.string().min(1).max(200),
  clientCompany: z.string().max(200).optional().nullable(),
  clientAddress: z.string().max(800).optional().nullable(),
  clientVatNumber: z.string().max(60).optional().nullable(),
  taxRate: z.coerce.number().min(0).max(30).default(20),
  dueAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createInvoiceFromJob(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("invoice.create");
    requirePlanFeature(user.agency, "invoices");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  let lineItems: Prisma.InvoiceLineItemCreateWithoutInvoiceInput[] = [];
  let subtotal = 0;
  let currency = user.agency.currency;

  if (d.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: d.jobId },
      include: {
        assignments: {
          where: { status: { in: ["CONFIRMED", "DONE"] } },
          include: { model: { include: { user: true } } },
        },
      },
    });
    if (!job || job.agencyId !== user.agencyId) return { ok: false as const, error: "Job not found" };
    currency = job.currency;

    const days = Math.max(
      1,
      Math.round((job.endDate.getTime() - job.startDate.getTime()) / 86400000) + 1,
    );

    for (const a of job.assignments) {
      const rate = a.rate ?? job.defaultRate ?? 0;
      const qty = (a.rateType ?? job.rateType) === "DAY" ? days : 1;
      const total = rate * qty;
      subtotal += total;
      lineItems.push({
        description: `${a.model.user.displayName} · ${job.title}`,
        quantity: qty,
        unitPrice: rate,
        total,
        modelId: a.modelId,
      });
    }
  } else {
    lineItems = [
      {
        description: "Services",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ];
  }

  // Sum tax per line (each can carry its own rate; falls back to header).
  const taxAmount = lineItems.reduce((s, li) => {
    const r = (li.taxRate ?? d.taxRate) / 100;
    return s + li.total * r;
  }, 0);
  const total = subtotal + taxAmount;
  const number = await nextInvoiceNumber(user.agencyId);

  const invoice = await prisma.invoice.create({
    data: {
      agencyId: user.agencyId,
      jobId: d.jobId ?? null,
      number,
      clientName: d.clientName,
      clientCompany: d.clientCompany ?? null,
      clientAddress: d.clientAddress ?? null,
      clientVatNumber: d.clientVatNumber ?? null,
      taxRate: d.taxRate,
      taxAmount,
      subtotal,
      total,
      currency,
      status: InvoiceStatus.DRAFT,
      dueAt: d.dueAt ? new Date(d.dueAt) : null,
      notes: d.notes ?? null,
      lineItems: { create: lineItems },
    },
  });

  revalidatePath("/agency/invoices");
  redirect(`/agency/invoices/${invoice.id}`);
}

export async function setInvoiceStatus(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("invoice.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const id = String(formData.get("invoiceId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  if (!Object.values(InvoiceStatus).includes(statusRaw as InvoiceStatus)) {
    return { ok: false as const, error: "Invalid status" };
  }
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  const status = statusRaw as InvoiceStatus;
  if (status === "PAID") {
    try {
      requireCan(user.agencyMembership?.role, "invoice.mark_paid");
    } catch (err) {
      return { ok: false as const, error: permissionError(err) };
    }
  }
  await prisma.invoice.update({
    where: { id },
    data: {
      status,
      sentAt: status === "SENT" && !invoice.sentAt ? new Date() : invoice.sentAt,
      paidAt: status === "PAID" ? new Date() : status === "SENT" ? null : invoice.paidAt,
    },
  });

  if (status === "PAID") {
    const created = await generatePayoutsForInvoice(id);
    await logEvent({
      agencyId: user.agencyId,
      actorId: user.id,
      actorName: user.displayName,
      action: "invoice.paid",
      entityType: "Invoice",
      entityId: id,
      summary: `${invoice.number} marked paid${created ? ` — ${created} model payout${created === 1 ? "" : "s"} queued` : ""}`,
    });
  } else {
    await logEvent({
      agencyId: user.agencyId,
      actorId: user.id,
      actorName: user.displayName,
      action: `invoice.status_${status.toLowerCase()}`,
      entityType: "Invoice",
      entityId: id,
      summary: `${invoice.number} → ${status.toLowerCase()}`,
    });
  }

  revalidatePath(`/agency/invoices/${id}`);
  revalidatePath("/agency/invoices");
  return { ok: true as const };
}

export async function deleteInvoice(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("invoice.delete");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const id = String(formData.get("invoiceId") ?? "");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/agency/invoices");
  redirect("/agency/invoices");
}
