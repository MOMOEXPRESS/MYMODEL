// GET /api/me/export
// Returns a JSON bundle of every record the caller owns or is a party to.
// This is the GDPR "right of access" response — a machine-readable copy of
// everything LuxLane holds about you. Served as a file download.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const safeName = user.displayName.replace(/[^\w\-. ]+/g, "_");
  const now = new Date().toISOString().slice(0, 10);

  const bundle: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    scope: user.role,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    },
    agency: user.agency
      ? {
          id: user.agency.id,
          name: user.agency.name,
          city: user.agency.city,
          country: user.agency.country,
          signupCode: user.agency.signupCode,
        }
      : null,
  };

  if (user.role === "MODEL") {
    const [model, documents, portfolio, availability, assignments, payouts, broadcasts] =
      await Promise.all([
        prisma.model.findUnique({ where: { userId: user.id } }),
        prisma.modelDocument.findMany({ where: { modelId: user.id } }),
        prisma.portfolioImage.findMany({ where: { modelId: user.id } }),
        prisma.availability.findMany({ where: { modelId: user.id } }),
        prisma.jobAssignment.findMany({
          where: { modelId: user.id },
          include: { job: true },
        }),
        prisma.modelPayout.findMany({ where: { modelId: user.id } }),
        prisma.broadcastResponse.findMany({
          where: { modelId: user.id },
          include: { broadcast: true },
        }),
      ]);
    Object.assign(bundle, {
      model,
      documents,
      portfolio,
      availability,
      assignments,
      payouts,
      broadcasts,
    });
  }

  if (user.role === "AGENCY_STAFF" && user.agencyId) {
    const [jobs, messagesSent, notifications] = await Promise.all([
      prisma.job.findMany({
        where: { agencyId: user.agencyId, ownerUserId: user.id },
      }),
      prisma.message.findMany({ where: { senderUserId: user.id } }),
      prisma.notification.findMany({ where: { userId: user.id } }),
    ]);
    Object.assign(bundle, { jobs, messagesSent, notifications });
  }

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="luxlane-export-${safeName}-${now}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
