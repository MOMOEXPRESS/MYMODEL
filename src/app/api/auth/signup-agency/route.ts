// Create a new Agency + OWNER user in one transaction.
//
// No email verification in v1 — the admin gate (brief §6) is the manual
// approval step, which we'll wire up with `suspended = true` by default
// once we have a LuxLane admin UI. For now we let owners in immediately
// so design partners can move fast.

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { generateSignupCode } from "@/lib/utils";

const schema = z.object({
  agencyName: z.string().min(2).max(80),
  city: z.string().min(1).max(80),
  country: z.string().length(2).default("FR"),
  ownerName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
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

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);

  // Retry on signup-code collision. 32^8 space, so extremely rare.
  let userId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSignupCode();
    try {
      const result = await prisma.$transaction(async (tx) => {
        const agency = await tx.agency.create({
          data: {
            name: data.agencyName,
            city: data.city,
            country: data.country,
            signupCode: code,
          },
        });
        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash,
            displayName: data.ownerName,
            role: "AGENCY_STAFF",
            agencyId: agency.id,
          },
        });
        await tx.agencyMember.create({
          data: { userId: user.id, agencyId: agency.id, role: "OWNER" },
        });
        return user.id;
      });
      userId = result;
      break;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue; // signup code collision — try again
      }
      throw err;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Could not allocate signup code" }, { status: 500 });
  }

  await setSessionCookie(userId);
  return NextResponse.json({ ok: true, next: "/agency" });
}
