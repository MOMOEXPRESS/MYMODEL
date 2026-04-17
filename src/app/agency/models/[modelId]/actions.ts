"use server";

import { revalidatePath } from "next/cache";
import { Division, DocumentType, ModelStatus, PortfolioKind, AvailabilityStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireModelAccess } from "@/lib/model-access";
import { uploadFile, UploadError } from "@/lib/blob";

// ── stats / measurements ─────────────────────────────────────────────

const measurementsSchema = z.object({
  modelId: z.string().cuid(),
  division: z.nativeEnum(Division),
  status: z.nativeEnum(ModelStatus),
  stageName: z.string().max(80).optional().nullable(),
  commissionPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  exclusions: z.string().optional().default(""), // comma-separated
  heightCm: z.coerce.number().int().min(100).max(230).optional().nullable(),
  bustCm: z.coerce.number().int().min(50).max(150).optional().nullable(),
  waistCm: z.coerce.number().int().min(40).max(150).optional().nullable(),
  hipsCm: z.coerce.number().int().min(40).max(200).optional().nullable(),
  shoeEu: z.coerce.number().int().min(30).max(55).optional().nullable(),
  dressEu: z.coerce.number().int().min(28).max(60).optional().nullable(),
  suitEu: z.coerce.number().int().min(38).max(64).optional().nullable(),
  inseamCm: z.coerce.number().int().min(50).max(120).optional().nullable(),
  hair: z.string().max(40).optional().nullable(),
  eyes: z.string().max(40).optional().nullable(),
});

export async function saveMeasurements(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    raw[k] = v === "" ? null : v;
  }
  const parsed = measurementsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const access = await requireModelAccess(data.modelId);
  if (!access.canEdit) return { ok: false as const, error: "Forbidden" };

  const measurements = {
    heightCm: data.heightCm ?? null,
    bustCm: data.bustCm ?? null,
    waistCm: data.waistCm ?? null,
    hipsCm: data.hipsCm ?? null,
    shoeEu: data.shoeEu ?? null,
    dressEu: data.dressEu ?? null,
    suitEu: data.suitEu ?? null,
    inseamCm: data.inseamCm ?? null,
    hair: data.hair ?? null,
    eyes: data.eyes ?? null,
  };

  const exclusions = data.exclusions
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Snapshot prior measurements so history is preserved before overwrite.
  const existing = await prisma.model.findUnique({
    where: { userId: data.modelId },
    select: { measurements: true },
  });
  if (existing?.measurements) {
    await prisma.measurementSnapshot.create({
      data: {
        modelId: data.modelId,
        measurements: existing.measurements as object,
        takenByUserId: access.userId,
      },
    });
  }

  await prisma.model.update({
    where: { userId: data.modelId },
    data: {
      division: data.division,
      status: data.status,
      stageName: data.stageName?.trim() || null,
      commissionPercent: data.commissionPercent ?? null,
      exclusions,
      measurements,
    },
  });

  revalidatePath(`/agency/models/${data.modelId}`);
  revalidatePath(`/agency/roster`);
  revalidatePath(`/m/card`);
  return { ok: true as const };
}

// ── portfolio ────────────────────────────────────────────────────────

export async function uploadPortfolioImage(formData: FormData) {
  const modelId = String(formData.get("modelId") ?? "");
  const kindRaw = String(formData.get("kind") ?? "BOOK");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "No file" };
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return { ok: false as const, error: "Must be an image or video" };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false as const, error: "Max 25 MB" };
  }
  const kind = (["BOOK", "POLAROID", "VIDEO"].includes(kindRaw)
    ? kindRaw
    : "BOOK") as PortfolioKind;

  const access = await requireModelAccess(modelId);
  if (!access.canEdit) return { ok: false as const, error: "Forbidden" };

  let uploaded;
  try {
    uploaded = await uploadFile(file, { prefix: `agency/${access.agencyId}/portfolio/${modelId}` });
  } catch (err) {
    if (err instanceof UploadError) return { ok: false as const, error: err.message };
    throw err;
  }

  const max = await prisma.portfolioImage.aggregate({
    where: { modelId, kind },
    _max: { order: true },
  });
  const nextOrder = (max._max.order ?? -1) + 1;

  await prisma.portfolioImage.create({
    data: {
      modelId,
      url: uploaded.url,
      kind,
      order: nextOrder,
    },
  });

  revalidatePath(`/agency/models/${modelId}`);
  revalidatePath(`/m/card`);
  return { ok: true as const };
}

export async function deletePortfolioImage(formData: FormData) {
  const imageId = String(formData.get("imageId") ?? "");
  const img = await prisma.portfolioImage.findUnique({ where: { id: imageId } });
  if (!img) return { ok: false as const, error: "Not found" };
  const access = await requireModelAccess(img.modelId);
  if (!access.canEdit) return { ok: false as const, error: "Forbidden" };
  await prisma.portfolioImage.delete({ where: { id: imageId } });
  revalidatePath(`/agency/models/${img.modelId}`);
  revalidatePath(`/m/card`);
  return { ok: true as const };
}

// ── documents ────────────────────────────────────────────────────────

export async function uploadDocument(formData: FormData) {
  const modelId = String(formData.get("modelId") ?? "");
  const typeRaw = String(formData.get("type") ?? "OTHER");
  const expiresAtRaw = String(formData.get("expiresAt") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "No file" };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false as const, error: "Max 25 MB" };
  }

  const type = (
    ["PASSPORT", "VISA", "TAX_FORM", "CONTRACT", "RELEASE", "BANK_INFO", "OTHER"].includes(typeRaw)
      ? typeRaw
      : "OTHER"
  ) as DocumentType;

  const access = await requireModelAccess(modelId);
  if (!access.canEdit) return { ok: false as const, error: "Forbidden" };
  // Models can upload identity docs for themselves but can't view each other's —
  // no restriction needed here since access is already confirmed.

  let uploaded;
  try {
    uploaded = await uploadFile(file, { prefix: `agency/${access.agencyId}/docs/${modelId}` });
  } catch (err) {
    if (err instanceof UploadError) return { ok: false as const, error: err.message };
    throw err;
  }

  await prisma.modelDocument.create({
    data: {
      modelId,
      type,
      fileUrl: uploaded.url,
      fileName: file.name,
      expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  });

  revalidatePath(`/agency/models/${modelId}`);
  return { ok: true as const };
}

export async function deleteDocument(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const doc = await prisma.modelDocument.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false as const, error: "Not found" };
  const access = await requireModelAccess(doc.modelId);
  if (!access.canEdit) return { ok: false as const, error: "Forbidden" };
  await prisma.modelDocument.delete({ where: { id: documentId } });
  revalidatePath(`/agency/models/${doc.modelId}`);
  return { ok: true as const };
}

// ── availability ────────────────────────────────────────────────────

const availSchema = z.object({
  modelId: z.string().cuid(),
  date: z.string(), // YYYY-MM-DD
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "TRAVELING"]),
  reason: z.string().max(100).optional().nullable(),
});

export async function setAvailability(input: {
  modelId: string;
  date: string;
  status: "AVAILABLE" | "UNAVAILABLE" | "TRAVELING";
  reason?: string | null;
}) {
  const parsed = availSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { modelId, date, status, reason } = parsed.data;

  const access = await requireModelAccess(modelId);
  if (!access.canEdit) return { ok: false as const, error: "Forbidden" };

  const day = new Date(date + "T00:00:00.000Z");
  if (status === "AVAILABLE") {
    await prisma.availability.deleteMany({ where: { modelId, date: day } });
  } else {
    await prisma.availability.upsert({
      where: { modelId_date: { modelId, date: day } },
      create: {
        modelId,
        date: day,
        status: status as AvailabilityStatus,
        reason: reason ?? null,
      },
      update: { status: status as AvailabilityStatus, reason: reason ?? null },
    });
  }

  revalidatePath(`/agency/models/${modelId}`);
  revalidatePath(`/m/card`);
  return { ok: true as const };
}
