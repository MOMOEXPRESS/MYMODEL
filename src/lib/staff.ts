// Agency staff helpers — role resolution + permission checks in one call.

import { AgencyMemberRole } from "@prisma/client";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { requireCan, ForbiddenError, type Action } from "@/lib/permissions";

export type AgencyStaffSession = Awaited<ReturnType<typeof requireAgencyStaff>>;

export function staffRole(user: AgencyStaffSession): AgencyMemberRole {
  const role = user.agencyMembership?.role;
  if (!role) {
    throw new ForbiddenError("agency.edit_profile", null);
  }
  return role;
}

/** Authenticated agency staff who is allowed to perform `action`. */
export async function requireAgencyStaffCan(action: Action): Promise<AgencyStaffSession> {
  const user = await requireAgencyStaff();
  requireCan(user.agencyMembership?.role, action);
  return user;
}

export function permissionError(err: unknown, fallback = "Forbidden"): string {
  return err instanceof ForbiddenError ? err.message : fallback;
}
