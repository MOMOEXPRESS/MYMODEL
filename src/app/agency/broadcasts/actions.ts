"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  AssignmentStatus,
  BroadcastResponseValue,
  JobStatus,
  JobType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { getSessionUser } from "@/lib/auth";
import { syncHoldsForJob } from "@/lib/holds";
import { logEvent } from "@/lib/audit";

// Creating a broadcast can optionally spin up a Job in the same transaction
// and add the same targets as PROPOSED assignments. Useful when the
// broadcast IS the casting call — saves the booker a second step.
const jobFieldsSchema = z.object({
  createsJob: z.literal("1").optional(),
  jobTitle: z.string().min(2).max(120).optional().nullable(),
  jobType: z.nativeEnum(JobType).optional().nullable(),
  jobStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  jobEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const createSchema = z
  .object({
    body: z.string().min(1).max(2000),
    jobId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
    modelIds: z.array(z.string().cuid()).min(1).max(200),
  })
  .and(jobFieldsSchema);

export async function createBroadcast(input: unknown) {
  const user = await requireAgencyStaff();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { body, jobId, modelIds, createsJob, jobTitle, jobType, jobStartDate, jobEndDate } =
    parsed.data;

  const belongs = await prisma.model.count({
    where: { userId: { in: modelIds }, agencyId: user.agencyId },
  });
  if (belongs !== modelIds.length) {
    return { ok: false as const, error: "One of the models isn't on your roster" };
  }

  // Validate job fields if the "create a job" toggle is on.
  let effectiveJobId: string | undefined = jobId;
  let newJobId: string | null = null;
  if (createsJob === "1") {
    if (!jobTitle || !jobType || !jobStartDate || !jobEndDate) {
      return {
        ok: false as const,
        error: "Give the job a title, type and dates.",
      };
    }
    const start = new Date(jobStartDate + "T00:00:00.000Z");
    const end = new Date(jobEndDate + "T00:00:00.000Z");
    if (end.getTime() < start.getTime()) {
      return { ok: false as const, error: "End date cannot be before start date." };
    }
    const job = await prisma.job.create({
      data: {
        agencyId: user.agencyId,
        ownerUserId: user.id,
        title: jobTitle,
        type: jobType,
        startDate: start,
        endDate: end,
        status: JobStatus.OPEN,
        currency: user.agency.currency,
        brief: body,
        assignments: {
          create: modelIds.map((modelId) => ({
            modelId,
            status: AssignmentStatus.PROPOSED,
            proposedByUserId: user.id,
          })),
        },
      },
    });
    newJobId = job.id;
    effectiveJobId = job.id;
    await syncHoldsForJob(job.id);
    await logEvent({
      agencyId: user.agencyId,
      actorId: user.id,
      actorName: user.displayName,
      action: "job.created_from_broadcast",
      entityType: "Job",
      entityId: job.id,
      summary: `Created ${jobTitle} from a broadcast (${modelIds.length} proposed)`,
    });
  }

  const bc = await prisma.broadcast.create({
    data: {
      agencyId: user.agencyId,
      senderUserId: user.id,
      body,
      jobId: effectiveJobId ?? null,
      responses: {
        create: modelIds.map((modelId) => ({
          modelId,
          response: BroadcastResponseValue.NO_RESPONSE,
        })),
      },
    },
  });

  await prisma.notification.createMany({
    data: modelIds.map((modelId) => ({
      userId: modelId,
      type: "BROADCAST",
      payload: {
        broadcastId: bc.id,
        senderName: user.displayName,
        preview: body.slice(0, 140),
        jobId: effectiveJobId ?? null,
      },
    })),
  });

  revalidatePath("/agency/broadcasts");
  if (newJobId) {
    revalidatePath(`/agency/jobs/${newJobId}`);
    revalidatePath("/agency/jobs");
    revalidatePath("/agency/board");
  }
  return { ok: true as const, broadcastId: bc.id, jobId: newJobId };
}

export async function respondToBroadcast(input: {
  broadcastId: string;
  response: "ACCEPT" | "DECLINE";
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "MODEL") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const target = await prisma.broadcastResponse.findUnique({
    where: { broadcastId_modelId: { broadcastId: input.broadcastId, modelId: user.id } },
  });
  if (!target) return { ok: false as const, error: "Not a recipient" };

  await prisma.broadcastResponse.update({
    where: { broadcastId_modelId: { broadcastId: input.broadcastId, modelId: user.id } },
    data: {
      response: input.response as BroadcastResponseValue,
      respondedAt: new Date(),
    },
  });

  // If the model said YES and the broadcast is linked to a job, auto-promote
  // the assignment from PROPOSED → OPTION_1 so the booker doesn't have to
  // click through; agency can still demote if needed.
  if (input.response === "ACCEPT") {
    const bc = await prisma.broadcast.findUnique({
      where: { id: input.broadcastId },
      select: { jobId: true },
    });
    if (bc?.jobId) {
      await prisma.jobAssignment.updateMany({
        where: { jobId: bc.jobId, modelId: user.id, status: "PROPOSED" },
        data: { status: "OPTION_1" },
      });
      // Keep the Board in sync.
      const { syncHoldsForJob } = await import("@/lib/holds");
      await syncHoldsForJob(bc.jobId);
    }
  }

  revalidatePath("/m");
  return { ok: true as const };
}
