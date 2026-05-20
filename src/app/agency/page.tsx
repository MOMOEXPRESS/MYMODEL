import { redirect } from "next/navigation";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { homePathForUser } from "@/lib/routing";

export default async function AgencyRoot() {
  const user = await requireAgencyStaff();
  redirect(homePathForUser(user.role, user.agencyMembership?.role ?? null));
}
