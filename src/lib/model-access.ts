// Shared tenancy guard for model-scoped actions.
//
// An agency staff user can edit any model in their agency. A model user can
// edit only their own card. Everything else is 403.

import { notFound } from "next/navigation";
import { prisma } from "./db";
import { getSessionUser } from "./auth";

export type ModelAccess = {
  modelId: string;
  agencyId: string;
  canEdit: boolean;
  actor: "AGENCY_STAFF" | "MODEL";
};

export async function requireModelAccess(modelUserId: string): Promise<ModelAccess> {
  const actor = await getSessionUser();
  if (!actor) throw new Error("UNAUTHORIZED");

  const model = await prisma.model.findUnique({
    where: { userId: modelUserId },
    select: { userId: true, agencyId: true },
  });
  if (!model) notFound();

  if (actor.role === "AGENCY_STAFF") {
    if (actor.agencyId !== model.agencyId) throw new Error("FORBIDDEN");
    return {
      modelId: model.userId,
      agencyId: model.agencyId,
      canEdit: true,
      actor: "AGENCY_STAFF",
    };
  }

  if (actor.role === "MODEL" && actor.id === model.userId) {
    return {
      modelId: model.userId,
      agencyId: model.agencyId,
      canEdit: true,
      actor: "MODEL",
    };
  }

  throw new Error("FORBIDDEN");
}
