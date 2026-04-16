"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { syncHoldsForJob } from "@/lib/holds";
import { logEvent } from "@/lib/audit";
import { requireCan, ForbiddenError } from "@/lib/permissions";

function forbidden(err: unknown, fallback: string) {
  return { ok: false as const, error: err instanceof ForbiddenError ? err.message : fallback };
}

// ── Jobs ───────────────────────────────────────────────────────

export async function restoreJob(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "job.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("jobId") ?? "");
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.job.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });
  await syncHoldsForJob(id);
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "job.restored",
    entityType: "Job",
    entityId: id,
    summary: `Restored ${job.title}`,
  });
  revalidatePath("/agency/trash");
  revalidatePath("/agency/jobs");
  revalidatePath("/agency/board");
  return { ok: true as const };
}

export async function purgeJob(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "job.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("jobId") ?? "");
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  if (!job.deletedAt) return { ok: false as const, error: "Restore first, then delete from the list." };
  await prisma.job.delete({ where: { id } });
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "job.purged",
    entityType: "Job",
    entityId: id,
    summary: `Permanently deleted ${job.title}`,
  });
  revalidatePath("/agency/trash");
  return { ok: true as const };
}

// ── Invoices ────────────────────────────────────────────────────

export async function softDeleteInvoice(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "invoice.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("invoiceId") ?? "");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.invoice.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "invoice.deleted",
    entityType: "Invoice",
    entityId: id,
    summary: `Deleted invoice ${invoice.number}`,
  });
  revalidatePath("/agency/invoices");
  revalidatePath("/agency/trash");
  return { ok: true as const };
}

export async function restoreInvoice(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "invoice.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("invoiceId") ?? "");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.invoice.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });
  revalidatePath("/agency/trash");
  revalidatePath("/agency/invoices");
  return { ok: true as const };
}

export async function purgeInvoice(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "invoice.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("invoiceId") ?? "");
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice || invoice.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  if (!invoice.deletedAt) return { ok: false as const, error: "Must be soft-deleted first" };
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/agency/trash");
  return { ok: true as const };
}

// ── Contracts ──────────────────────────────────────────────────

export async function softDeleteContract(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "contract.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("contractId") ?? "");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.contract.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: user.id },
  });
  revalidatePath("/agency/contracts");
  revalidatePath("/agency/trash");
  return { ok: true as const };
}

export async function restoreContract(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "contract.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("contractId") ?? "");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.contract.update({
    where: { id },
    data: { deletedAt: null, deletedById: null },
  });
  revalidatePath("/agency/trash");
  revalidatePath("/agency/contracts");
  return { ok: true as const };
}

export async function purgeContract(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "contract.delete");
  } catch (err) {
    return forbidden(err, "Forbidden");
  }
  const id = String(formData.get("contractId") ?? "");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  if (!contract.deletedAt) return { ok: false as const, error: "Must be soft-deleted first" };
  await prisma.contract.delete({ where: { id } });
  revalidatePath("/agency/trash");
  return { ok: true as const };
}
