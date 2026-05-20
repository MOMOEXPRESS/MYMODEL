"use server";

// Agency-side actions for Client records that power the client portal.
// Owners and Bookers can create / edit / revoke access. Magic link is
// a random 24-byte token; rotating it invalidates existing sessions.

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";
import { logEvent } from "@/lib/audit";
import { syncClientPlatformLink, tryLinkClientOnEnablePortal } from "@/lib/client-link";
import type { ClientSubtype } from "@prisma/client";

function mintToken(): string {
  return randomBytes(24).toString("base64url");
}

const upsertSchema = z.object({
  clientId: z.string().cuid().optional().nullable(),
  name: z.string().min(1).max(120),
  companyName: z.string().max(120).optional().nullable(),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  subtype: z
    .enum([
      "BRAND",
      "MEDIA_AGENCY",
      "PRODUCTION",
      "MAGAZINE",
      "ECOMMERCE",
      "CASTING_DIRECTOR",
      "PHOTOGRAPHER",
      "DESIGNER",
      "PR_EVENTS",
      "TV_FILM",
      "OTHER",
    ])
    .optional(),
});

export async function upsertClient(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("client.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = upsertSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  if (d.clientId) {
    const existing = await prisma.client.findUnique({ where: { id: d.clientId } });
    if (!existing || existing.agencyId !== user.agencyId) {
      return { ok: false as const, error: "Not found" };
    }
    await prisma.client.update({
      where: { id: d.clientId },
      data: {
        name: d.name,
        companyName: d.companyName ?? null,
        email: d.email,
        phone: d.phone ?? null,
        subtype: (d.subtype as ClientSubtype) ?? undefined,
      },
    });
    await syncClientPlatformLink(d.clientId, d.email);
  } else {
    const created = await prisma.client.create({
      data: {
        agencyId: user.agencyId,
        name: d.name,
        companyName: d.companyName ?? null,
        email: d.email,
        phone: d.phone ?? null,
        subtype: (d.subtype as ClientSubtype) ?? "BRAND",
        createdByUserId: user.id,
      },
    });
    await syncClientPlatformLink(created.id, d.email);
  }

  revalidatePath("/agency/clients");
  return { ok: true as const };
}

export async function enablePortal(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("client.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  const token = mintToken();
  await prisma.client.update({
    where: { id: clientId },
    data: {
      portalEnabled: true,
      portalToken: token,
      portalTokenIssuedAt: new Date(),
    },
  });
  await tryLinkClientOnEnablePortal(clientId);
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "client.portal_enabled",
    entityType: "Client",
    entityId: clientId,
    summary: `Enabled client portal for ${client.name}`,
  });
  revalidatePath("/agency/clients");
  revalidatePath(`/agency/clients/${clientId}`);
  return { ok: true as const, token };
}

export async function linkClientPlatformUser(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("client.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await syncClientPlatformLink(clientId, client.email);
  revalidatePath("/agency/clients");
  revalidatePath(`/agency/clients/${clientId}`);
  return { ok: true as const };
}

export async function revokePortal(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("client.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.client.update({
    where: { id: clientId },
    data: { portalEnabled: false, portalToken: null, portalTokenIssuedAt: null },
  });
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "client.portal_revoked",
    entityType: "Client",
    entityId: clientId,
    summary: `Revoked client portal for ${client.name}`,
  });
  revalidatePath("/agency/clients");
  return { ok: true as const };
}

export async function rotatePortalToken(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("client.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  const token = mintToken();
  await prisma.client.update({
    where: { id: clientId },
    data: { portalToken: token, portalTokenIssuedAt: new Date(), portalEnabled: true },
  });
  revalidatePath("/agency/clients");
  return { ok: true as const, token };
}

export async function deleteClient(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("client.edit");
  } catch (err) {
    return { ok: false as const, error: permissionError(err) };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/agency/clients");
  return { ok: true as const };
}
