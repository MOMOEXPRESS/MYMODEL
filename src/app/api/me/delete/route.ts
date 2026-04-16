// DELETE /api/me
// GDPR right-to-erasure. Anonymizes instead of hard-deleting so audit trails
// don't break: email, displayName, phone are scrubbed; PII-bearing rows
// (documents, portfolio, messages) are removed; assignments and audit events
// survive but lose the link-back.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { clearSessionCookie, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Owners must transfer or cancel first — removing the owner without a
  // handoff would strand the agency. Refuse politely.
  if (user.agencyMembership?.role === "OWNER") {
    return NextResponse.json(
      {
        error:
          "You're the agency owner — transfer ownership to another team member, or cancel the agency, before deleting your account.",
      },
      { status: 409 },
    );
  }

  const randomEmail = `deleted+${randomBytes(8).toString("hex")}@luxlane.local`;

  if (user.role === "MODEL") {
    await prisma.$transaction([
      prisma.modelDocument.deleteMany({ where: { modelId: user.id } }),
      prisma.portfolioImage.deleteMany({ where: { modelId: user.id } }),
      prisma.availability.deleteMany({ where: { modelId: user.id } }),
      prisma.message.deleteMany({ where: { senderUserId: user.id } }),
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.broadcastResponse.deleteMany({ where: { modelId: user.id } }),
      // Assignments stay (the job still happened) but the model row goes.
      prisma.model.delete({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          email: randomEmail,
          passwordHash: "",
          displayName: "Deleted model",
          phone: null,
          suspended: true,
        },
      }),
    ]);
  } else {
    // Agency staff — detach from the team, scrub PII, suspend.
    await prisma.$transaction([
      prisma.agencyMember.deleteMany({ where: { userId: user.id } }),
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          email: randomEmail,
          passwordHash: "",
          displayName: "Deleted user",
          phone: null,
          agencyId: null,
          suspended: true,
        },
      }),
    ]);
  }

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
