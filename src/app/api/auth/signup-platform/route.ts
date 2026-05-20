import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { linkAgencyClientsByEmail } from "@/lib/client-link";
import { homePathForUser } from "@/lib/routing";
import type { ClientSubtype, CreativeSubtype, UserRole } from "@prisma/client";

const schema = z.object({
  role: z.enum(["CLIENT", "CREATIVE", "MEMBER"]),
  displayName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  clientSubtype: z
    .enum([
      "BRAND",
      "MEDIA_AGENCY",
      "PRODUCTION",
      "MAGAZINE",
      "ECOMMERCE",
      "CASTING_DIRECTOR",
      "PHOTOGRAPHER",
      "DESIGNER",
      "PR_EVENTS",
      "TV_FILM",
      "OTHER",
    ])
    .optional(),
  creativeSubtype: z
    .enum(["PHOTOGRAPHER", "STYLIST", "MUA", "HAIR", "SET_DESIGN", "OTHER"])
    .optional(),
  companyName: z.string().optional(),
  city: z.string().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(data.password);
  const role = data.role as UserRole;

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        displayName: data.displayName,
        role,
      },
    });
    if (role === "CLIENT") {
      await tx.clientProfile.create({
        data: {
          userId: u.id,
          subtype: (data.clientSubtype ?? "BRAND") as ClientSubtype,
          companyName: data.companyName,
          city: data.city,
        },
      });
    } else if (role === "CREATIVE") {
      await tx.creativeProfile.create({
        data: {
          userId: u.id,
          subtype: (data.creativeSubtype ?? "PHOTOGRAPHER") as CreativeSubtype,
          city: data.city,
        },
      });
    } else {
      await tx.memberProfile.create({
        data: { userId: u.id, city: data.city },
      });
    }
    return u;
  });

  if (role === "CLIENT") {
    await linkAgencyClientsByEmail(user.id, data.email);
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, next: homePathForUser(user.role, null) });
}
