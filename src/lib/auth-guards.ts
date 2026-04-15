// Server-side guards for pages and route handlers.

import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

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

/** Require a model user — for /m routes. */
export async function requireModel() {
  const user = await requireUser();
  if (user.role !== "MODEL" || !user.agencyId) {
    redirect("/login");
  }
  return user;
}
