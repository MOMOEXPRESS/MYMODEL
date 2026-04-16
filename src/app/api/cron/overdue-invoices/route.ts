// GET /api/cron/overdue-invoices
// Flips SENT invoices whose dueAt has passed to OVERDUE. Notifies the
// agency owner per agency with a roll-up count.
//
// Protected by Vercel's CRON_SECRET header (auto-attached when Vercel calls
// your own cron endpoint). Returns 401 otherwise.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const flipped = await prisma.invoice.updateMany({
    where: {
      status: "SENT",
      dueAt: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  // Per-agency owner notifications.
  const overdueByAgency = await prisma.invoice.groupBy({
    by: ["agencyId"],
    where: { status: "OVERDUE" },
    _count: { _all: true },
    _sum: { total: true },
  });

  for (const o of overdueByAgency) {
    const owner = await prisma.user.findFirst({
      where: { agencyId: o.agencyId, role: "AGENCY_STAFF" },
      include: { agencyMembership: true },
    });
    if (!owner || owner.agencyMembership?.role !== "OWNER") continue;

    await prisma.notification.create({
      data: {
        userId: owner.id,
        type: "OVERDUE_ROLLUP",
        payload: {
          count: o._count._all,
          total: o._sum.total ?? 0,
        },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    flipped: flipped.count,
    agenciesNotified: overdueByAgency.length,
  });
}
