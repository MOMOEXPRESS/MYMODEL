// GET /api/cron/doc-expiry
// Scans ModelDocument for anything expiring in the next 30 days and creates
// one notification per agency owner if there's anything to report. Idempotent
// within a day: we skip if we've already sent today.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const todayIso = now.toISOString().slice(0, 10);

  const docs = await prisma.modelDocument.findMany({
    where: { expiresAt: { gte: now, lte: in30 } },
    include: { model: { select: { agencyId: true } } },
  });

  const counts = new Map<string, number>();
  for (const d of docs) {
    counts.set(d.model.agencyId, (counts.get(d.model.agencyId) ?? 0) + 1);
  }

  let sent = 0;
  for (const [agencyId, count] of counts) {
    const owner = await prisma.user.findFirst({
      where: { agencyId, role: "AGENCY_STAFF" },
      include: { agencyMembership: true },
    });
    if (!owner || owner.agencyMembership?.role !== "OWNER") continue;

    // Skip if we already notified today.
    const already = await prisma.notification.findFirst({
      where: {
        userId: owner.id,
        type: "DOC_EXPIRY_ROLLUP",
        createdAt: { gte: new Date(todayIso + "T00:00:00.000Z") },
      },
    });
    if (already) continue;

    await prisma.notification.create({
      data: {
        userId: owner.id,
        type: "DOC_EXPIRY_ROLLUP",
        payload: { count },
      },
    });
    sent++;
  }

  return NextResponse.json({ ok: true, docsScanned: docs.length, notified: sent });
}
