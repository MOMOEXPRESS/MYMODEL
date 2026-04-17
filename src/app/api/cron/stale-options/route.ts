// GET /api/cron/stale-options
// Scans 1st-option (OPTION_1) assignments that have sat without a response for
// 48+ hours and pings the booker who proposed them. Options that sit cold rot
// the whole calendar — bookers want a nudge to chase or release.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STALE_HOURS = 48;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_HOURS * 3600 * 1000);
  const todayIso = new Date().toISOString().slice(0, 10);

  const stale = await prisma.jobAssignment.findMany({
    where: {
      status: "OPTION_1",
      proposedAt: { lt: cutoff },
      job: { deletedAt: null, startDate: { gte: new Date() } },
    },
    include: {
      job: { select: { id: true, title: true, agencyId: true, ownerUserId: true } },
      model: { include: { user: { select: { displayName: true } } } },
    },
  });

  let sent = 0;
  for (const a of stale) {
    const alreadyToday = await prisma.notification.findFirst({
      where: {
        userId: a.job.ownerUserId,
        type: "STALE_OPTION",
        createdAt: { gte: new Date(todayIso + "T00:00:00.000Z") },
        // Dedupe on entity id — one nudge per assignment per day.
        payload: { path: ["assignmentId"], equals: a.id },
      },
    });
    if (alreadyToday) continue;

    await prisma.notification.create({
      data: {
        userId: a.job.ownerUserId,
        type: "STALE_OPTION",
        payload: {
          assignmentId: a.id,
          jobId: a.job.id,
          jobTitle: a.job.title,
          modelName: a.model.user.displayName,
          hoursStale: Math.floor((Date.now() - a.proposedAt.getTime()) / 3_600_000),
        },
      },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, scanned: stale.length, notified: sent });
}
