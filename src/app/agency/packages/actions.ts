"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";
import { requirePlanFeature, planError } from "@/lib/plan-guard";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { logEvent } from "@/lib/audit";
import { mintPackageToken, packagePublicUrl } from "@/lib/packages";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  note: z.string().max(4000).optional().nullable(),
  modelIds: z.array(z.string().cuid()).min(1).max(50),
  password: z.string().max(80).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function createTalentPackage(input: unknown) {
  let user;
  try {
    user = await requireAgencyStaffCan("package.create");
    requirePlanFeature(user.agency, "packages");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const d = parsed.data;

  const count = await prisma.model.count({
    where: { userId: { in: d.modelIds }, agencyId: user.agencyId, status: "ACTIVE" },
  });
  if (count !== d.modelIds.length) {
    return { ok: false as const, error: "One or more models are invalid" };
  }

  const token = mintPackageToken();
  const passwordHash =
    d.password && d.password.length >= 4 ? await hashPassword(d.password) : null;

  const pkg = await prisma.talentPackage.create({
    data: {
      agencyId: user.agencyId,
      title: d.title,
      token,
      note: d.note ?? null,
      passwordHash,
      expiresAt: d.expiresAt ? new Date(d.expiresAt + "T23:59:59.000Z") : null,
      createdByUserId: user.id,
      items: {
        create: d.modelIds.map((modelId, i) => ({
          modelId,
          sortOrder: i,
        })),
      },
    },
  });

  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "package.created",
    entityType: "TalentPackage",
    entityId: pkg.id,
    summary: `Package "${d.title}" · ${d.modelIds.length} model(s)`,
  });

  revalidatePath("/agency/packages");
  return { ok: true as const, packageId: pkg.id, url: packagePublicUrl(token) };
}

const emailSchema = z.object({
  packageId: z.string().cuid(),
  recipients: z.array(z.string().email()).min(1).max(20),
  message: z.string().max(2000).optional().nullable(),
});

export async function emailTalentPackage(input: unknown) {
  let user;
  try {
    user = await requireAgencyStaffCan("package.send");
    requirePlanFeature(user.agency, "packages");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }

  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const d = parsed.data;

  const pkg = await prisma.talentPackage.findUnique({
    where: { id: d.packageId },
    include: { items: true },
  });
  if (!pkg || pkg.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }

  const url = packagePublicUrl(pkg.token);
  const body = `${d.message ? d.message + "\n\n" : ""}${user.agency.name} shared a talent package (${pkg.items.length} model${pkg.items.length === 1 ? "" : "s"}):\n\n${url}\n\n— Sent via LuxLane`;

  await sendEmail({
    to: d.recipients,
    subject: `${user.agency.name}: ${pkg.title}`,
    text: body,
  });

  await prisma.talentPackage.update({
    where: { id: pkg.id },
    data: {
      lastEmailedAt: new Date(),
      emailRecipients: Array.from(new Set([...pkg.emailRecipients, ...d.recipients])),
    },
  });

  revalidatePath("/agency/packages");
  return { ok: true as const };
}

export async function revokeTalentPackage(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("package.create");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const id = String(formData.get("packageId") ?? "");
  const pkg = await prisma.talentPackage.findUnique({ where: { id } });
  if (!pkg || pkg.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.talentPackage.update({
    where: { id },
    data: {
      token: `revoked-${randomBytes(8).toString("hex")}`,
      expiresAt: new Date(),
    },
  });
  revalidatePath("/agency/packages");
  return { ok: true as const };
}

export async function deleteTalentPackage(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("package.create");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const id = String(formData.get("packageId") ?? "");
  const pkg = await prisma.talentPackage.findUnique({ where: { id } });
  if (!pkg || pkg.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.talentPackage.delete({ where: { id } });
  revalidatePath("/agency/packages");
  return { ok: true as const };
}
