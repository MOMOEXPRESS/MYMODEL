import { prisma } from "@/lib/db";
import type { NetworkVisibility, UserRole } from "@prisma/client";

export async function canUserReceiveConnectionRequest(
  targetUserId: string,
  fromUserId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (targetUserId === fromUserId) {
    return { ok: false, reason: "You cannot connect with yourself." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { model: true },
  });
  if (!target || target.suspended) {
    return { ok: false, reason: "User not found." };
  }

  if (target.role === "MODEL" && target.model) {
    const vis = target.model.networkVisibility;
    if (vis === "HIDDEN") {
      return { ok: false, reason: "This profile is not open to connections." };
    }
    if (vis === "AGENCY_ONLY" && target.model.representation === "AGENCY_SIGNED") {
      const from = await prisma.user.findUnique({ where: { id: fromUserId } });
      if (!from?.agencyId || from.agencyId !== target.model.agencyId) {
        return {
          ok: false,
          reason: "This model only accepts connections from their agency network.",
        };
      }
    }
  }

  return { ok: true };
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "AGENCY_STAFF":
      return "Agency";
    case "MODEL":
      return "Model";
    case "CLIENT":
      return "Client";
    case "CREATIVE":
      return "Creative";
    case "MEMBER":
      return "Member";
    default:
      return "User";
  }
}
