// POST /api/auth/reset-password { token, password }
// Consumes a PasswordReset and sets the user's new password.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(24),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const reset = await prisma.passwordReset.findUnique({
    where: { token: parsed.data.token },
  });
  if (!reset || reset.consumedAt || reset.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link is invalid or expired" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { consumedAt: new Date() },
    }),
    // Revoke any other outstanding resets for this user.
    prisma.passwordReset.updateMany({
      where: { userId: reset.userId, consumedAt: null, NOT: { id: reset.id } },
      data: { consumedAt: new Date() },
    }),
  ]);

  await setSessionCookie(reset.userId);
  const user = await prisma.user.findUnique({ where: { id: reset.userId } });
  return NextResponse.json({
    ok: true,
    next: user?.role === "MODEL" ? "/m" : "/agency",
  });
}
