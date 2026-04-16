// Model signup via an agency's signup code.
// No code = no account. This is deliberate — brief §2 and §5.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  agencyCode: z.string().min(4).max(32),
  displayName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  phone: z.string().optional(),
  division: z.enum(["WOMEN", "MEN", "CURVE", "KIDS", "TALENTS", "NEW_FACES"]).default("WOMEN"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const agency = await prisma.agency.findUnique({
    where: { signupCode: data.agencyCode.toUpperCase() },
  });
  if (!agency) {
    return NextResponse.json({ error: "Unknown agency code" }, { status: 404 });
  }

  // Plan limits — only enforced when the agency is on a paid plan.
  const { planLimits } = await import("@/lib/plans");
  const { maxModels } = planLimits(agency.subscriptionPlan);
  const current = await prisma.model.count({ where: { agencyId: agency.id } });
  if (current >= maxModels) {
    return NextResponse.json(
      { error: "This agency is at its model limit — they need to upgrade." },
      { status: 402 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
        phone: data.phone,
        role: "MODEL",
        agencyId: agency.id,
      },
    });
    await tx.model.create({
      data: {
        userId: u.id,
        agencyId: agency.id,
        division: data.division,
      },
    });
    return u;
  });

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, next: "/m" });
}
