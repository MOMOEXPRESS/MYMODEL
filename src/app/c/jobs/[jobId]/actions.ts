"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth-guards";

const schema = z.object({
  assignmentId: z.string().cuid(),
  reaction: z.enum(["APPROVE", "FLAG"]),
  note: z.string().max(400).optional().nullable(),
});

export async function clientUserReactToAssignment(input: unknown) {
  const user = await requireClient();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const a = await prisma.jobAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          clientId: true,
          agencyId: true,
          ownerUserId: true,
          client: { select: { platformUserId: true, name: true } },
        },
      },
      model: { include: { user: { select: { displayName: true } } } },
    },
  });
  if (
    !a?.job.clientId ||
    !a.job.client ||
    a.job.client.platformUserId !== user.id
  ) {
    return { ok: false as const, error: "Not found" };
  }

  await prisma.jobAssignment.update({
    where: { id: parsed.data.assignmentId },
    data: {
      clientReaction: parsed.data.reaction,
      clientReactionAt: new Date(),
      clientReactionNote: parsed.data.note?.trim() || null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: a.job.ownerUserId,
      type: parsed.data.reaction === "FLAG" ? "CLIENT_FLAGGED_MODEL" : "CLIENT_APPROVED_MODEL",
      payload: {
        jobId: a.job.id,
        jobTitle: a.job.title,
        modelName: a.model.user.displayName,
        clientName: a.job.client.name,
        reaction: parsed.data.reaction,
        note: parsed.data.note ?? null,
      },
    },
  });

  revalidatePath(`/c/jobs/${a.job.id}`);
  revalidatePath(`/agency/jobs/${a.job.id}`);
  revalidatePath(`/agency/bookings/${a.job.id}`);
  return { ok: true as const };
}
