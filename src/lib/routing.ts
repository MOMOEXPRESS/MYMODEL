import type { AgencyMemberRole, UserRole } from "@prisma/client";

export function homePathForUser(
  role: UserRole,
  agencyMemberRole?: AgencyMemberRole | null,
): string {
  switch (role) {
    case "AGENCY_STAFF":
      if (agencyMemberRole === "ACCOUNTS") return "/agency/money";
      if (agencyMemberRole === "PRODUCTION") return "/agency/production";
      return "/agency/workbench";
    case "MODEL":
      return "/m";
    case "CLIENT":
      return "/c";
    case "CREATIVE":
      return "/creative";
    case "MEMBER":
      return "/member";
    case "LUXLANE_ADMIN":
      return "/agency/workbench";
    default:
      return "/login";
  }
}

export const PLATFORM_NAV = {
  network: "/network",
  events: "/events",
} as const;
