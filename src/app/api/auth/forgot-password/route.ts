// POST /api/auth/forgot-password { email }
// Always 200s, even if the email doesn't exist (don't leak account presence).
// Issues a PasswordReset token and emails it.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, ipFromRequest } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: true });

  const ip = ipFromRequest(req);
  const byEmail = await checkRateLimit("forgotPassword", parsed.data.email.toLowerCase());
  const byIp = await checkRateLimit("forgotPassword", `ip:${ip}`);
  if (!byEmail.success || !byIp.success) {
    return NextResponse.json(
      { error: "Too many requests — try again in an hour." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Always pretend we sent, so attackers can't enumerate accounts.
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  });

  const origin = new URL(req.url).origin;
  const link = `${origin}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Reset your LuxLane password",
    text: `Hi ${user.displayName},

Someone — hopefully you — asked to reset your LuxLane password.

Open this link within the next hour to set a new one:
${link}

If you didn't request this, you can ignore this message.

— LuxLane`,
  });

  return NextResponse.json({ ok: true });
}
