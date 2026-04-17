"use server";

// Client-portal server action: react to a proposed model. Token-gated —
// no session user, the URL token is the auth. Revalidates the agency-side
// job page so the booker sees the stamp in real time.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  token: z.string().min(8),
  assignmentId: z.string().cuid(),
  reaction: z.enum(["APPROVE", "FLAG"]),
  note: z.string().max(400).optional().nullable(),
});

export async function clientReactToAssignment(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { token, assignmentId, reaction, note } = parsed.data;

  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    select: { id: true, agencyId: true, name: true, portalEnabled: true },
  });
  if (!client || !client.portalEnabled) return { ok: false as const, error: "Invalid link" };

  const a = await prisma.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      job: { select: { id: true, title: true, clientId: true, agencyId: true, ownerUserId: true } },
      model: { include: { user: { select: { displayName: true } } } },
    },
  });
  if (!a || a.job.clientId !== client.id || a.job.agencyId !== client.agencyId) {
    return { ok: false as const, error: "Not found" };
  }

  await prisma.jobAssignment.update({
    where: { id: assignmentId },
    data: {
      clientReaction: reaction,
      clientReactionAt: new Date(),
      clientReactionNote: note?.trim() || null,
    },
  });

  // Ping the booker — they're the ones who need to act on a flag.
  await prisma.notification.create({
    data: {
      userId: a.job.ownerUserId,
      type: reaction === "FLAG" ? "CLIENT_FLAGGED_MODEL" : "CLIENT_APPROVED_MODEL",
      payload: {
        jobId: a.job.id,
        jobTitle: a.job.title,
        modelName: a.model.user.displayName,
        clientName: client.name,
        reaction,
        note: note ?? null,
      },
    },
  });

  revalidatePath(`/client/${token}/jobs/${a.job.id}`);
  revalidatePath(`/agency/jobs/${a.job.id}`);
  return { ok: true as const };
}
