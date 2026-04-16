"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProspectStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { uploadFile } from "@/lib/blob";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().nullable(),
  instagramHandle: z.string().max(60).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export async function createProspect(formData: FormData) {
  const user = await requireAgencyStaff();
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k === "image") continue;
    raw[k] = v === "" ? null : v;
  }
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  const file = formData.get("image");
  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { ok: false as const, error: "Image only" };
    }
    const uploaded = await uploadFile(file, {
      prefix: `agency/${user.agencyId}/prospects`,
    });
    imageUrl = uploaded.url;
  }

  await prisma.prospect.create({
    data: {
      agencyId: user.agencyId,
      createdByUserId: user.id,
      name: d.name,
      email: d.email ?? null,
      phone: d.phone ?? null,
      instagramHandle: d.instagramHandle ?? null,
      city: d.city ?? null,
      source: d.source ?? null,
      notes: d.notes ?? null,
      imageUrl,
    },
  });

  revalidatePath("/agency/prospects");
  return { ok: true as const };
}

export async function updateProspectStatus(formData: FormData) {
  const user = await requireAgencyStaff();
  const id = String(formData.get("prospectId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  if (!Object.values(ProspectStatus).includes(statusRaw as ProspectStatus)) {
    return { ok: false as const, error: "Invalid status" };
  }
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p || p.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.prospect.update({
    where: { id },
    data: { status: statusRaw as ProspectStatus },
  });
  revalidatePath("/agency/prospects");
  return { ok: true as const };
}

export async function deleteProspect(formData: FormData) {
  const user = await requireAgencyStaff();
  const id = String(formData.get("prospectId") ?? "");
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p || p.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/agency/prospects");
  return { ok: true as const };
}
