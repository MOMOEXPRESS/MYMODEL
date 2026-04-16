"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { AgencyMemberRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

// ── Agency profile (incl. invoice fields) ──────────────────────

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().max(80).optional().nullable(),
  country: z.string().length(2).optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  defaultCommissionPercent: z.coerce.number().min(0).max(100),
  legalName: z.string().max(200).optional().nullable(),
  addressLine: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  siret: z.string().max(40).optional().nullable(),
  vatNumber: z.string().max(40).optional().nullable(),
  iban: z.string().max(64).optional().nullable(),
  bic: z.string().max(24).optional().nullable(),
  publicSiteEnabled: z.string().optional(),
});

export async function updateAgencyProfile(formData: FormData) {
  const user = await requireAgencyStaff();
  if (user.agencyMembership?.role !== "OWNER") {
    return { ok: false as const, error: "Only the owner can edit the agency profile" };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  await prisma.agency.update({
    where: { id: user.agencyId },
    data: {
      name: d.name,
      city: d.city ?? null,
      country: d.country ?? user.agency.country,
      currency: (d.currency ?? user.agency.currency).toUpperCase(),
      defaultCommissionPercent: d.defaultCommissionPercent,
      legalName: d.legalName ?? null,
      addressLine: d.addressLine ?? null,
      postalCode: d.postalCode ?? null,
      siret: d.siret ?? null,
      vatNumber: d.vatNumber ?? null,
      iban: d.iban ?? null,
      bic: d.bic ?? null,
      publicSiteEnabled: d.publicSiteEnabled === "on",
    },
  });
  revalidatePath("/agency/settings");
  revalidatePath("/agency");
  return { ok: true as const };
}

// ── Team members ───────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(AgencyMemberRole),
});

export async function createTeamInvite(formData: FormData) {
  const user = await requireAgencyStaff();
  if (user.agencyMembership?.role !== "OWNER") {
    return { ok: false as const, error: "Only the owner can invite team members" };
  }
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const token = randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000);

  await prisma.teamInvite.create({
    data: {
      agencyId: user.agencyId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      token,
      expiresAt: expires,
    },
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${origin}/signup/team?token=${token}`;
  await sendEmail({
    to: parsed.data.email,
    subject: `You've been invited to ${user.agency.name} on LuxLane`,
    text: `Hi,

${user.displayName} invited you to join ${user.agency.name} on LuxLane as a ${parsed.data.role.toLowerCase()}.

Accept the invite within the next 14 days:
${link}

— LuxLane`,
  });

  revalidatePath("/agency/settings");
  return { ok: true as const, token };
}

export async function removeTeamMember(formData: FormData) {
  const user = await requireAgencyStaff();
  if (user.agencyMembership?.role !== "OWNER") {
    return { ok: false as const, error: "Only the owner can remove team members" };
  }
  const userId = String(formData.get("userId") ?? "");
  if (userId === user.id) return { ok: false as const, error: "Can't remove yourself" };
  const member = await prisma.agencyMember.findUnique({ where: { userId } });
  if (!member || member.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  // Downgrade: keep the user row for audit, delete membership + role.
  await prisma.agencyMember.delete({ where: { userId } });
  await prisma.user.update({ where: { id: userId }, data: { suspended: true } });
  revalidatePath("/agency/settings");
  return { ok: true as const };
}

export async function deleteTeamInvite(formData: FormData) {
  const user = await requireAgencyStaff();
  if (user.agencyMembership?.role !== "OWNER") {
    return { ok: false as const, error: "Only the owner can manage invites" };
  }
  const id = String(formData.get("inviteId") ?? "");
  const inv = await prisma.teamInvite.findUnique({ where: { id } });
  if (!inv || inv.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.teamInvite.delete({ where: { id } });
  revalidatePath("/agency/settings");
  return { ok: true as const };
}

// ── Consume team invite at signup (public action, not wrapped) ─

const consumeSchema = z.object({
  token: z.string().min(16),
  displayName: z.string().min(2).max(80),
  password: z.string().min(8).max(200),
});

export async function consumeTeamInvite(input: unknown) {
  const parsed = consumeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { token, displayName, password } = parsed.data;

  const invite = await prisma.teamInvite.findUnique({ where: { token } });
  if (!invite) return { ok: false as const, error: "Invalid or used invite" };
  if (invite.consumedAt) return { ok: false as const, error: "Already used" };
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return { ok: false as const, error: "Expired" };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: invite.email,
        passwordHash,
        displayName,
        role: "AGENCY_STAFF",
        agencyId: invite.agencyId,
      },
    });
    await tx.agencyMember.create({
      data: { userId: u.id, agencyId: invite.agencyId, role: invite.role },
    });
    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date() },
    });
    return u;
  });

  return { ok: true as const, userId: user.id };
}
