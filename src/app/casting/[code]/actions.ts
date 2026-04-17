"use server";

// Public server action — prospect books a slot on a casting event. No auth,
// rate-limited via the slot's uniqueness constraint (one booking per slot).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/audit";

const bookSchema = z.object({
  code: z.string().min(4).max(32),
  slotStartIso: z.string().datetime(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  notes: z.string().max(600).optional().nullable(),
});

export async function bookCastingSlot(input: unknown) {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { code, slotStartIso, name, email, phone, notes } = parsed.data;

  const event = await prisma.castingEvent.findUnique({ where: { code } });
  if (!event) return { ok: false as const, error: "Casting not found" };

  const startAt = new Date(slotStartIso);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false as const, error: "Invalid slot" };
  }

  // Don't let the same person spam multiple slots.
  const alreadyBooked = await prisma.castingSlot.findFirst({
    where: { eventId: event.id, bookedEmail: email, bookedAt: { not: null } },
  });
  if (alreadyBooked) {
    return { ok: false as const, error: "You already have a slot booked for this casting." };
  }

  try {
    await prisma.castingSlot.create({
      data: {
        eventId: event.id,
        startAt,
        bookedName: name,
        bookedEmail: email,
        bookedPhone: phone?.trim() || null,
        notes: notes?.trim() || null,
        bookedAt: new Date(),
      },
    });
  } catch {
    return { ok: false as const, error: "That slot just got taken." };
  }

  await logEvent({
    agencyId: event.agencyId,
    actorId: "public",
    actorName: name,
    action: "casting.slot_booked",
    entityType: "CastingEvent",
    entityId: event.id,
    summary: `${name} booked ${startAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
  });

  revalidatePath(`/casting/${code}`);
  revalidatePath(`/agency/castings/${event.id}`);
  return { ok: true as const };
}
