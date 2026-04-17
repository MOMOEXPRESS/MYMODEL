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

// ── Counter-offer ─────────────────────────────────────────────────
// The model sees the booker's proposed rate and can counter. The booker
// sees the counter on /agency/jobs/[id] and either accepts (copies to rate)
// or rejects (clears the counter).

const counterSchema = z.object({
  jobId: z.string().cuid(),
  proposedRate: z.coerce.number().min(0).max(10_000_000),
  note: z.string().max(400).optional().nullable(),
});

export async function proposeCounterRate(input: unknown) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "MODEL") return { ok: false as const, error: "Unauthorized" };
  const parsed = counterSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { jobId, proposedRate, note } = parsed.data;

  const a = await prisma.jobAssignment.findFirst({
    where: { jobId, modelId: actor.id },
    include: { job: { select: { title: true, ownerUserId: true, agencyId: true } } },
  });
  if (!a) return { ok: false as const, error: "You aren't attached to this job" };

  await prisma.jobAssignment.update({
    where: { id: a.id },
    data: { modelProposedRate: proposedRate, modelRateNote: note?.trim() || null },
  });
  await prisma.notification.create({
    data: {
      userId: a.job.ownerUserId,
      type: "MODEL_COUNTER_OFFER",
      payload: {
        jobId,
        jobTitle: a.job.title,
        modelName: actor.displayName,
        proposedRate,
        note: note ?? null,
      },
    },
  });
  await logEvent({
    agencyId: a.job.agencyId,
    actorId: actor.id,
    actorName: actor.displayName,
    action: "assignment.counter_offer",
    entityType: "JobAssignment",
    entityId: a.id,
    summary: `${actor.displayName} countered at ${proposedRate} on ${a.job.title}`,
  });
  revalidatePath(`/m/jobs/${jobId}`);
  revalidatePath(`/agency/jobs/${jobId}`);
  return { ok: true as const };
}

// ── Callsheet "I've read this" ────────────────────────────────────

export async function confirmCallsheetRead(input: { jobId: string }) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "MODEL") return { ok: false as const, error: "Unauthorized" };
  const a = await prisma.jobAssignment.findFirst({
    where: { jobId: input.jobId, modelId: actor.id },
    include: { job: { select: { title: true, ownerUserId: true, agencyId: true } } },
  });
  if (!a) return { ok: false as const, error: "Not attached" };
  await prisma.jobAssignment.update({
    where: { id: a.id },
    data: { callsheetReadAt: new Date() },
  });
  await logEvent({
    agencyId: a.job.agencyId,
    actorId: actor.id,
    actorName: actor.displayName,
    action: "assignment.callsheet_read",
    entityType: "JobAssignment",
    entityId: a.id,
    summary: `${actor.displayName} acknowledged callsheet for ${a.job.title}`,
  });
  revalidatePath(`/m/jobs/${input.jobId}`);
  revalidatePath(`/agency/jobs/${input.jobId}`);
  return { ok: true as const };
}

// ── Day-of check-in ───────────────────────────────────────────────

export async function checkInOnSet(input: { jobId: string }) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "MODEL") return { ok: false as const, error: "Unauthorized" };
  const a = await prisma.jobAssignment.findFirst({
    where: { jobId: input.jobId, modelId: actor.id },
    include: { job: { select: { title: true, ownerUserId: true, agencyId: true, startDate: true, endDate: true } } },
  });
  if (!a) return { ok: false as const, error: "Not attached" };

  // Only allow check-in within the shoot window (start -1d → end +1d).
  const now = new Date();
  const earliest = new Date(a.job.startDate.getTime() - 86400 * 1000);
  const latest = new Date(a.job.endDate.getTime() + 86400 * 1000);
  if (now.getTime() < earliest.getTime() || now.getTime() > latest.getTime()) {
    return { ok: false as const, error: "Check-in only available on shoot days" };
  }

  await prisma.jobAssignment.update({
    where: { id: a.id },
    data: { checkedInAt: new Date() },
  });
  await prisma.notification.create({
    data: {
      userId: a.job.ownerUserId,
      type: "MODEL_CHECKED_IN",
      payload: {
        jobId: input.jobId,
        jobTitle: a.job.title,
        modelName: actor.displayName,
      },
    },
  });
  await logEvent({
    agencyId: a.job.agencyId,
    actorId: actor.id,
    actorName: actor.displayName,
    action: "assignment.checked_in",
    entityType: "JobAssignment",
    entityId: a.id,
    summary: `${actor.displayName} checked in on set for ${a.job.title}`,
  });
  revalidatePath(`/m/jobs/${input.jobId}`);
  revalidatePath(`/agency/jobs/${input.jobId}`);
  return { ok: true as const };
}

// ── Outfit reactions ──────────────────────────────────────────────

const outfitReactSchema = z.object({
  optionId: z.string().cuid(),
  reaction: z.enum(["APPROVE", "FLAG"]),
  note: z.string().max(400).optional().nullable(),
});

export async function reactToOutfit(input: unknown) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "MODEL") return { ok: false as const, error: "Unauthorized" };
  const parsed = outfitReactSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { optionId, reaction, note } = parsed.data;

  const opt = await prisma.outfitOption.findUnique({
    where: { id: optionId },
    include: { job: { select: { id: true, agencyId: true, title: true, ownerUserId: true } } },
  });
  if (!opt) return { ok: false as const, error: "Not found" };
  if (opt.job.agencyId !== actor.agencyId) return { ok: false as const, error: "Forbidden" };

  // Must be on the job as a model.
  const attached = await prisma.jobAssignment.findFirst({
    where: { jobId: opt.jobId, modelId: actor.id },
  });
  if (!attached) return { ok: false as const, error: "Not on this job" };

  await prisma.outfitReaction.upsert({
    where: { optionId_modelId: { optionId, modelId: actor.id } },
    create: {
      optionId,
      modelId: actor.id,
      reaction,
      note: note?.trim() || null,
    },
    update: { reaction, note: note?.trim() || null },
  });
  if (reaction === "FLAG") {
    await prisma.notification.create({
      data: {
        userId: opt.job.ownerUserId,
        type: "OUTFIT_FLAGGED",
        payload: {
          jobId: opt.jobId,
          jobTitle: opt.job.title,
          modelName: actor.displayName,
          outfitTitle: opt.title,
          note: note ?? null,
        },
      },
    });
  }
  revalidatePath(`/m/jobs/${opt.jobId}`);
  revalidatePath(`/agency/jobs/${opt.jobId}`);
  return { ok: true as const };
}
