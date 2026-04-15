// JWT cookie auth.
//
// One cookie, `ll_session`, holds a signed JWT with { userId }.
// We look the user up fresh on every request so role / agency
// changes take effect immediately. No refresh token dance.

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { env } from "./env";
import { prisma } from "./db";

// Lazy — don't touch env.AUTH_SECRET at module load so build-time page-data
// collection doesn't require it. Computed + cached on first request.
let SECRET_BYTES: Uint8Array | null = null;
function secret(): Uint8Array {
  if (!SECRET_BYTES) SECRET_BYTES = new TextEncoder().encode(env.AUTH_SECRET);
  return SECRET_BYTES;
}

const COOKIE_NAME = "ll_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await signSession({ userId });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      agency: true,
      agencyMembership: true,
    },
  });

  if (!user || user.suspended) return null;
  return user;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
