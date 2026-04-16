// GET /api/health
// Lightweight uptime probe. Pings the DB to confirm reachability.
// 200 + { ok: true } in the happy path; 503 if the DB throws.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        ok: true,
        ts: Date.now(),
        version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }
}
