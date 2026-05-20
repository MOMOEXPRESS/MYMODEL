"use server";

// Agency-side casting event CRUD. Slot creation is driven by the event's
// window + slotMinutes; we materialize slots on demand so changing the
// window doesn't strand orphan bookings.

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAgencyStaffCan, permissionError } from "@/lib/staff";
import { requirePlanFeature, planError } from "@/lib/plan-guard";
import { logEvent } from "@/lib/audit";

function mintCode(): string {
  return randomBytes(6).toString("base64url").replace(/[_-]/g, "").slice(0, 8).toLowerCase();
}

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotMinutes: z.coerce.number().int().min(5).max(120).default(15),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).default("10:00"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).default("18:00"),
});

export async function createCastingEvent(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("prospect.edit");
    requirePlanFeature(user.agency, "scouting");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  // Ensure unique code — retry a few times on collision (unlikely).
  let code = mintCode();
  for (let i = 0; i < 3; i++) {
    const exists = await prisma.castingEvent.findUnique({ where: { code } });
    if (!exists) break;
    code = mintCode();
  }

  const event = await prisma.castingEvent.create({
    data: {
      agencyId: user.agencyId,
      title: d.title,
      description: d.description ?? null,
      location: d.location ?? null,
      date: new Date(d.date + "T00:00:00.000Z"),
      slotMinutes: d.slotMinutes,
      startTime: d.startTime,
      endTime: d.endTime,
      code,
      createdByUserId: user.id,
    },
  });

  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "casting.created",
    entityType: "CastingEvent",
    entityId: event.id,
    summary: `Created casting: ${d.title}`,
  });

  revalidatePath("/agency/castings");
  return { ok: true as const, eventId: event.id };
}

export async function deleteCastingEvent(formData: FormData) {
  let user;
  try {
    user = await requireAgencyStaffCan("prospect.edit");
    requirePlanFeature(user.agency, "scouting");
  } catch (err) {
    return { ok: false as const, error: permissionError(err, planError(err)) };
  }
  const eventId = String(formData.get("eventId") ?? "");
  const event = await prisma.castingEvent.findUnique({ where: { id: eventId } });
  if (!event || event.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.castingEvent.delete({ where: { id: eventId } });
  revalidatePath("/agency/castings");
  return { ok: true as const };
}
