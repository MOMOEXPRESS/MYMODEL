"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TravelType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";

const addSchema = z.object({
  jobId: z.string().cuid(),
  modelId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  type: z.nativeEnum(TravelType),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  fromLocation: z.string().max(120).optional().nullable(),
  toLocation: z.string().max(120).optional().nullable(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  reference: z.string().max(60).optional().nullable(),
});

export async function addTravelItem(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("travel.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = addSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: d.jobId } });
  if (!job || job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };

  await prisma.travelItem.create({
    data: {
      jobId: d.jobId,
      modelId: d.modelId ?? null,
      type: d.type,
      title: d.title,
      description: d.description ?? null,
      fromLocation: d.fromLocation ?? null,
      toLocation: d.toLocation ?? null,
      startAt: d.startAt ? new Date(d.startAt) : null,
      endAt: d.endAt ? new Date(d.endAt) : null,
      reference: d.reference ?? null,
    },
  });

  revalidatePath(`/agency/jobs/${d.jobId}`);
  revalidatePath(`/m/jobs/${d.jobId}`);
  return { ok: true as const };
}

export async function deleteTravelItem(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("travel.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const id = String(formData.get("itemId") ?? "");
  const item = await prisma.travelItem.findUnique({
    where: { id },
    include: { job: { select: { agencyId: true, id: true } } },
  });
  if (!item || item.job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.travelItem.delete({ where: { id } });
  revalidatePath(`/agency/jobs/${item.job.id}`);
  revalidatePath(`/m/jobs/${item.job.id}`);
  return { ok: true as const };
}
