"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BroadcastResponseValue } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { getSessionUser } from "@/lib/auth";

const createSchema = z.object({
  body: z.string().min(1).max(2000),
  jobId: z.string().cuid().optional().or(z.literal("").transform(() => undefined)),
  modelIds: z.array(z.string().cuid()).min(1).max(200),
});

export async function createBroadcast(input: unknown) {
  const user = await requireAgencyStaff();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { body, jobId, modelIds } = parsed.data;

  // Confirm all target models belong to the agency.
  const belongs = await prisma.model.count({
    where: { userId: { in: modelIds }, agencyId: user.agencyId },
  });
  if (belongs !== modelIds.length) {
    return { ok: false as const, error: "One of the models isn't on your roster" };
  }

  const bc = await prisma.broadcast.create({
    data: {
      agencyId: user.agencyId,
      senderUserId: user.id,
      body,
      jobId: jobId ?? null,
      responses: {
        create: modelIds.map((modelId) => ({
          modelId,
          response: BroadcastResponseValue.NO_RESPONSE,
        })),
      },
    },
  });

  // Notify targets.
  await prisma.notification.createMany({
    data: modelIds.map((modelId) => ({
      userId: modelId,
      type: "BROADCAST",
      payload: {
        broadcastId: bc.id,
        senderName: user.displayName,
        preview: body.slice(0, 140),
      },
    })),
  });

  revalidatePath("/agency/broadcasts");
  return { ok: true as const, broadcastId: bc.id };
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

  revalidatePath("/m");
  return { ok: true as const };
}
