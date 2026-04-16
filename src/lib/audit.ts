// Activity log helper.
//
// Call this from server actions after a successful mutation. Fire-and-forget
// semantics: if the audit insert fails we log and move on rather than
// blocking the user's action.

import { prisma } from "./db";

export type AuditInput = {
  agencyId: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  diff?: Record<string, unknown>;
};

export async function logEvent(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        agencyId: input.agencyId,
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        summary: input.summary,
        diff: (input.diff ?? null) as never,
      },
    });
  } catch (err) {
    // Never surface audit failures — they shouldn't break the user's flow.
    console.error("[audit] write failed:", err);
  }
}
