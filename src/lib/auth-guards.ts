// Server-side guards for pages and route handlers.

import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import type { UserRole } from "@prisma/client";

/** Require any authenticated, non-suspended user. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an agency staff member — for /agency routes. */
export async function requireAgencyStaff() {
  const user = await requireUser();
  if (user.role !== "AGENCY_STAFF" || !user.agencyId || !user.agency) {
    redirect("/login");
  }
  return user as typeof user & {
    agencyId: string;
    agency: NonNullable<typeof user.agency>;
  };
}

/** Require a model user — for /m routes (agency-signed or independent). */
export async function requireModel() {
  const user = await requireUser();
  if (user.role !== "MODEL") {
    redirect("/login");
  }
  return user;
}

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/login");
  return user;
}

export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "CLIENT") redirect("/login");
  return user;
}

export async function requireCreative() {
  const user = await requireUser();
  if (user.role !== "CREATIVE") redirect("/login");
  return user;
}

export async function requireMember() {
  const user = await requireUser();
  if (user.role !== "MEMBER") redirect("/login");
  return user;
}

/** Any platform user with a profile (for network / events). */
export async function requirePlatformUser() {
  const user = await requireUser();
  const allowed: UserRole[] = ["AGENCY_STAFF", "MODEL", "CLIENT", "CREATIVE", "MEMBER"];
  if (!allowed.includes(user.role)) redirect("/login");
  return user;
}
