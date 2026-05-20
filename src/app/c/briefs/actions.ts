"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth-guards";
import type { JobType } from "@prisma/client";

const briefSchema = z.object({
  targetAgencyId: z.string().cuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(8000).optional(),
  location: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function submitClientBrief(formData: FormData) {
  const user = await requireClient();
  const parsed = briefSchema.safeParse({
    targetAgencyId: formData.get("targetAgencyId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    city: formData.get("city") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  });
  if (!parsed.success) redirect("/c/briefs?error=invalid");

  const linked = await prisma.client.findFirst({
    where: { platformUserId: user.id, agencyId: parsed.data.targetAgencyId },
  });
  if (!linked) {
    redirect("/c/briefs?error=not_linked");
  }

  const brief = await prisma.clientBrief.create({
    data: {
      authorUserId: user.id,
      targetAgencyId: parsed.data.targetAgencyId,
      agencyClientId: linked.id,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      city: parsed.data.city,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate + "T00:00:00.000Z") : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate + "T00:00:00.000Z") : null,
      status: "SUBMITTED",
    },
  });

  const owner = await prisma.agencyMember.findFirst({
    where: { agencyId: parsed.data.targetAgencyId, role: "OWNER" },
    select: { userId: true },
  });
  if (owner) {
    await prisma.notification.create({
      data: {
        userId: owner.userId,
        type: "CLIENT_BRIEF_SUBMITTED",
        payload: {
          briefId: brief.id,
          title: brief.title,
          clientName: user.displayName,
        },
      },
    });
  }

  revalidatePath("/c/briefs");
  revalidatePath("/agency/workbench");
  redirect("/c/briefs");
}

export async function acceptClientBrief(formData: FormData) {
  const { requireAgencyStaffCan } = await import("@/lib/staff");
  const user = await requireAgencyStaffCan("job.create");
  const briefId = String(formData.get("briefId") ?? "");
  const brief = await prisma.clientBrief.findUnique({
    where: { id: briefId },
    include: { agencyClient: true },
  });
  if (!brief || brief.targetAgencyId !== user.agencyId || brief.status !== "SUBMITTED") {
    redirect("/agency/workbench");
  }

  const start = brief.startDate ?? new Date();
  const end = brief.endDate ?? brief.startDate ?? start;
  const job = await prisma.$transaction(async (tx) => {
    const j = await tx.job.create({
      data: {
        agencyId: user.agencyId,
        title: brief.title,
        type: "COMMERCIAL" as JobType,
        startDate: start,
        endDate: end,
        location: brief.location,
        locationCity: brief.city,
        brief: brief.description,
        status: "DRAFT",
        ownerUserId: user.id,
        clientId: brief.agencyClientId,
        briefId: brief.id,
      },
    });
    await tx.clientBrief.update({
      where: { id: briefId },
      data: { status: "CONVERTED", agencyClientId: brief.agencyClientId },
    });
    return j;
  });

  revalidatePath("/agency/workbench");
  revalidatePath("/agency/bookings");
  redirect(`/agency/bookings/${job.id}`);
}
