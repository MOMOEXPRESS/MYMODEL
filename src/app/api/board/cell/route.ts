// PATCH /api/board/cell
//
// Body: { modelIds: string[], dates: string[], status: "AVAILABLE"|"UNAVAILABLE"|"TRAVELING", reason?: string }
//
// Sets the availability for a cross-product of (models × dates). In Sprint 2
// the Board only drives availability edits directly — option / confirm
// transitions go through the Jobs view (Sprint 3).

import { NextResponse } from "next/server";
import { z } from "zod";
import { AvailabilityStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { utcDate } from "@/lib/board";

const schema = z.object({
  modelIds: z.array(z.string().cuid()).min(1).max(500),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(120),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "TRAVELING"]),
  reason: z.string().max(100).optional().nullable(),
});

export async function PATCH(req: Request) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "AGENCY_STAFF" || !actor.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { modelIds, dates, status, reason } = parsed.data;

  // Confirm every model belongs to this agency — tenancy guard.
  const count = await prisma.model.count({
    where: { userId: { in: modelIds }, agencyId: actor.agencyId },
  });
  if (count !== modelIds.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateObjs = dates.map(utcDate);

  if (status === "AVAILABLE") {
    await prisma.availability.deleteMany({
      where: {
        modelId: { in: modelIds },
        date: { in: dateObjs },
      },
    });
  } else {
    // Upsert loop. ~60 cells typical — cheap enough and keeps the SQL simple.
    await prisma.$transaction(async (tx) => {
      for (const modelId of modelIds) {
        for (const date of dateObjs) {
          await tx.availability.upsert({
            where: { modelId_date: { modelId, date } },
            create: {
              modelId,
              date,
              status: status as AvailabilityStatus,
              reason: reason ?? null,
            },
            update: {
              status: status as AvailabilityStatus,
              reason: reason ?? null,
            },
          });
        }
      }
    });
  }

  return NextResponse.json({ ok: true, updated: modelIds.length * dates.length });
}
