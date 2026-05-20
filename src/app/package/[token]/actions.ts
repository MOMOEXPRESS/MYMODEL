"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";

const UNLOCK_COOKIE = "ll_pkg_unlock";

const schema = z.object({
  token: z.string().min(8),
  password: z.string().min(1).max(80),
});

export async function unlockPackage(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid" };
  const { token, password } = parsed.data;

  const pkg = await prisma.talentPackage.findUnique({
    where: { token },
    select: { passwordHash: true, expiresAt: true },
  });
  if (!pkg?.passwordHash) return { ok: false as const, error: "Not protected" };
  if (pkg.expiresAt && pkg.expiresAt < new Date()) {
    return { ok: false as const, error: "Link expired" };
  }

  const valid = await verifyPassword(password, pkg.passwordHash);
  if (!valid) return { ok: false as const, error: "Wrong password" };

  const jar = await cookies();
  jar.set(`${UNLOCK_COOKIE}_${token}`, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: `/package/${token}`,
    maxAge: 60 * 60 * 24 * 7,
  });

  return { ok: true as const };
}
