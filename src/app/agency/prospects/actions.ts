"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProspectStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";
import { requirePlanFeature, planError } from "@/lib/plan-guard";
import { uploadFile, UploadError } from "@/lib/blob";

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
  let user;
  try {
    user = await requireAgencyStaffCan("prospect.edit");
    requirePlanFeature(user.agency, "scouting");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
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
    try {
      const uploaded = await uploadFile(file, {
        prefix: `agency/${user.agencyId}/prospects`,
      });
      imageUrl = uploaded.url;
    } catch (err) {
      if (err instanceof UploadError) return { ok: false as const, error: err.message };
      throw err;
    }
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
  let user;
  try {
    user = await requireAgencyStaffCan("prospect.edit");
    requirePlanFeature(user.agency, "scouting");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
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
  let user;
  try {
    user = await requireAgencyStaffCan("prospect.edit");
    requirePlanFeature(user.agency, "scouting");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const id = String(formData.get("prospectId") ?? "");
  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p || p.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/agency/prospects");
  return { ok: true as const };
}

// Convert a Prospect into a real Model + User. Requires an email on the
// prospect (so we can send them their password reset). Creates a random
// password; the model signs in via the reset link.
export async function convertProspectToModel(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("prospect.edit");
    requirePlanFeature(user.agency, "scouting");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const id = String(formData.get("prospectId") ?? "");
  const division = String(formData.get("division") ?? "WOMEN");
  if (!["WOMEN", "MEN", "CURVE", "KIDS", "TALENTS", "NEW_FACES"].includes(division)) {
    return { ok: false as const, error: "Invalid division" };
  }

  const p = await prisma.prospect.findUnique({ where: { id } });
  if (!p || p.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  if (!p.email) return { ok: false as const, error: "Add an email to the prospect first" };
  const exists = await prisma.user.findUnique({ where: { email: p.email.toLowerCase() } });
  if (exists) return { ok: false as const, error: "A user with that email already exists" };

  const { randomBytes } = await import("node:crypto");
  const bcrypt = (await import("bcryptjs")).default;
  // Random password the user never sees; they use the reset-password flow.
  const tempPassword = randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: p.email!.toLowerCase(),
        passwordHash,
        displayName: p.name,
        phone: p.phone,
        role: "MODEL",
        agencyId: p.agencyId,
      },
    });
    await tx.model.create({
      data: {
        userId: u.id,
        agencyId: p.agencyId,
        division: division as never,
        status: "ACTIVE",
      },
    });
    // Carry the scouted photo into the polaroid book.
    if (p.imageUrl) {
      await tx.portfolioImage.create({
        data: { modelId: u.id, url: p.imageUrl, kind: "POLAROID", order: 0 },
      });
    }
    await tx.prospect.update({
      where: { id: p.id },
      data: { status: "SIGNED", convertedUserId: u.id },
    });
    return u;
  });

  // Issue a password reset so the new model can set their own password.
  const token = (await import("node:crypto")).randomBytes(24).toString("hex");
  await prisma.passwordReset.create({
    data: {
      userId: result.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  });

  // Fire-and-forget welcome email.
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { sendEmail } = await import("@/lib/email");
  await sendEmail({
    to: p.email!,
    subject: `Welcome to ${user.agency.name}`,
    text: `Hi ${p.name},

${user.displayName} from ${user.agency.name} has signed you to the agency's roster. Set your password and fill in your card:

${origin}/reset-password?token=${token}

This link expires in seven days.

— LuxLane`,
  });

  revalidatePath("/agency/prospects");
  revalidatePath("/agency/roster");
  return { ok: true as const, userId: result.id };
}
