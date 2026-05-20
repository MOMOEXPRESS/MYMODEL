"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ContractKind, ContractStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";
import { requirePlanFeature, planError } from "@/lib/plan-guard";
import { uploadFile, UploadError } from "@/lib/blob";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  kind: z.nativeEnum(ContractKind),
  modelId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  jobId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createContract(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("contract.create");
    requirePlanFeature(user.agency, "contracts");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "file") continue;
    raw[k] = v === "" ? null : v;
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  const file = formData.get("file");
  let fileUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 25 * 1024 * 1024) return { ok: false as const, error: "Max 25 MB" };
    try {
      const uploaded = await uploadFile(file, {
        prefix: `agency/${user.agencyId}/contracts`,
      });
      fileUrl = uploaded.url;
    } catch (err) {
      if (err instanceof UploadError) return { ok: false as const, error: err.message };
      throw err;
    }
  }

  const contract = await prisma.contract.create({
    data: {
      agencyId: user.agencyId,
      title: d.title,
      kind: d.kind,
      modelId: d.modelId ?? null,
      jobId: d.jobId ?? null,
      fileUrl,
      notes: d.notes ?? null,
    },
  });

  revalidatePath("/agency/contracts");
  return { ok: true as const, contractId: contract.id };
}

export async function sendForSignature(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("contract.send");
    requirePlanFeature(user.agency, "contracts");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const id = String(formData.get("contractId") ?? "");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  if (!contract.fileUrl) {
    return { ok: false as const, error: "Upload the contract file first" };
  }
  const token = randomBytes(18).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  await prisma.contract.update({
    where: { id },
    data: {
      status: ContractStatus.SENT,
      sentAt: new Date(),
      sigToken: token,
      sigTokenExpiresAt: expiresAt,
    },
  });

  if (contract.modelId) {
    await prisma.notification.create({
      data: {
        userId: contract.modelId,
        type: "CONTRACT",
        payload: {
          contractId: contract.id,
          title: contract.title,
          signUrl: `/sign/${token}`,
        },
      },
    });
  }

  revalidatePath("/agency/contracts");
  return { ok: true as const, token };
}

const signSchema = z.object({
  token: z.string().min(16),
  fullName: z.string().min(2).max(120),
});

export async function signContract(input: unknown) {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { token, fullName } = parsed.data;

  const contract = await prisma.contract.findUnique({ where: { sigToken: token } });
  if (!contract) return { ok: false as const, error: "Invalid link" };
  if (contract.status === "SIGNED") return { ok: false as const, error: "Already signed" };
  if (contract.status === "CANCELLED") return { ok: false as const, error: "This contract has been cancelled" };
  if (contract.sigTokenExpiresAt && contract.sigTokenExpiresAt < new Date()) {
    return { ok: false as const, error: "This signing link has expired" };
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: ContractStatus.SIGNED,
      signedAt: new Date(),
      signedName: fullName,
      sigToken: null,
    },
  });

  revalidatePath("/agency/contracts");
  return { ok: true as const };
}

export async function deleteContract(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("contract.delete");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const id = String(formData.get("contractId") ?? "");
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract || contract.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.contract.delete({ where: { id } });
  revalidatePath("/agency/contracts");
  return { ok: true as const };
}
