import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { checkRateLimit, ipFromRequest } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Rate-limit by email + IP. Both buckets must allow.
  const ip = ipFromRequest(req);
  const byEmail = await checkRateLimit("login", email.toLowerCase());
  const byIp = await checkRateLimit("login", `ip:${ip}`);
  if (!byEmail.success || !byIp.success) {
    return NextResponse.json(
      { error: "Too many attempts — try again in a few minutes." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.suspended) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await setSessionCookie(user.id);

  const next = user.role === "MODEL" ? "/m" : "/agency";
  return NextResponse.json({ ok: true, next });
}
