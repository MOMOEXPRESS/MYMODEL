// GET /api/cron/purge-trash
// Permanently deletes Jobs / Invoices / Contracts soft-deleted more than 30
// days ago. Protected by CRON_SECRET.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [jobs, invoices, contracts] = await Promise.all([
    prisma.job.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.invoice.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
    prisma.contract.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
  ]);

  return NextResponse.json({
    ok: true,
    purged: { jobs: jobs.count, invoices: invoices.count, contracts: contracts.count },
  });
}
