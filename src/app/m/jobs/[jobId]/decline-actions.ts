"use server";

// Server action: a MODEL declines or accepts a hold on a job they're attached
// to. Updates their JobAssignment and resyncs holds so the Board reflects it.
//
// Tenancy: only the model themselves can act on their own assignment.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { syncHoldsForJob } from "@/lib/holds";
import { logEvent } from "@/lib/audit";

const schema = z.object({
  jobId: z.string().cuid(),
  decision: z.enum(["DECLINE", "ACCEPT"]),
  reason: z.string().max(500).optional().nullable(),
});

export async function modelDecideHold(input: unknown) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "MODEL") {
    return { ok: false as const, error: "Unauthorized" };
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { jobId, decision, reason } = parsed.data;

  const a = await prisma.jobAssignment.findFirst({
    where: { jobId, modelId: actor.id },
    include: { job: true },
  });
  if (!a) return { ok: false as const, error: "You aren't attached to this job" };

  if (decision === "DECLINE") {
    await prisma.jobAssignment.update({
      where: { id: a.id },
      data: {
        status: AssignmentStatus.DECLINED,
        declinedAt: new Date(),
        notes: reason ? `Model declined: ${reason}` : "Model declined",
      },
    });
    // Also notify the agency owner / job owner so they know to find a replacement.
    await prisma.notification.create({
      data: {
        userId: a.job.ownerUserId,
        type: "MODEL_DECLINED",
        payload: {
          jobId,
          jobTitle: a.job.title,
          modelName: actor.displayName,
          reason: reason ?? null,
        },
      },
    });
    await logEvent({
      agencyId: a.job.agencyId,
      actorId: actor.id,
      actorName: actor.displayName,
      action: "assignment.declined_by_model",
      entityType: "JobAssignment",
      entityId: a.id,
      summary: `${actor.displayName} declined ${a.job.title}${reason ? ` — ${reason}` : ""}`,
    });
  } else {
    // Acknowledging an option — promote PROPOSED → OPTION_1, leave higher
    // statuses untouched (the agency drives those).
    if (a.status === "PROPOSED") {
      await prisma.jobAssignment.update({
        where: { id: a.id },
        data: { status: AssignmentStatus.OPTION_1, confirmedAt: null },
      });
    }
    await logEvent({
      agencyId: a.job.agencyId,
      actorId: actor.id,
      actorName: actor.displayName,
      action: "assignment.acknowledged_by_model",
      entityType: "JobAssignment",
      entityId: a.id,
      summary: `${actor.displayName} confirmed availability for ${a.job.title}`,
    });
  }

  await syncHoldsForJob(jobId);
  revalidatePath(`/m/jobs/${jobId}`);
  revalidatePath(`/agency/jobs/${jobId}`);
  revalidatePath("/agency/board");
  return { ok: true as const };
}
