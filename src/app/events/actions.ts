"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/auth-guards";
import type { GroupEventMemberRole, GroupEventType } from "@prisma/client";

export async function createGroupEvent(formData: FormData) {
  const user = await requirePlatformUser();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "COLLAB") as GroupEventType;
  const startDate = String(formData.get("startDate") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const linkedJobIdRaw = String(formData.get("linkedJobId") ?? "").trim();
  let linkedJobId: string | null = null;
  if (linkedJobIdRaw && user.role === "AGENCY_STAFF" && user.agencyId) {
    const job = await prisma.job.findFirst({
      where: { id: linkedJobIdRaw, agencyId: user.agencyId, deletedAt: null },
      select: { id: true },
    });
    if (job) linkedJobId = job.id;
  }

  if (!title || !startDate) return;

  const event = await prisma.groupEvent.create({
    data: {
      hostUserId: user.id,
      title,
      type,
      startDate: new Date(startDate),
      location,
      city,
      description,
      status: "OPEN",
      linkedJobId,
    },
  });

  await prisma.groupEventMember.create({
    data: {
      eventId: event.id,
      userId: user.id,
      role: "HOST",
      status: "ACCEPTED",
    },
  });

  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function applyToGroupEvent(formData: FormData) {
  const user = await requirePlatformUser();
  const eventId = String(formData.get("eventId") ?? "");
  const role = String(formData.get("role") ?? "OTHER") as GroupEventMemberRole;
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!eventId) return;

  const event = await prisma.groupEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "OPEN") return;

  await prisma.groupEventMember.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, role, status: "APPLIED", note },
    update: { role, status: "APPLIED", note },
  });

  revalidatePath(`/events/${eventId}`);
}

export async function inviteToGroupEvent(formData: FormData) {
  const user = await requirePlatformUser();
  const eventId = String(formData.get("eventId") ?? "");
  const inviteUserId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "OTHER") as GroupEventMemberRole;
  if (!eventId || !inviteUserId) return;

  const event = await prisma.groupEvent.findUnique({ where: { id: eventId } });
  if (!event || event.hostUserId !== user.id) return;

  const connected = await prisma.connection.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { fromUserId: user.id, toUserId: inviteUserId },
        { fromUserId: inviteUserId, toUserId: user.id },
      ],
    },
  });
  if (!connected) return;

  await prisma.groupEventMember.upsert({
    where: { eventId_userId: { eventId, userId: inviteUserId } },
    create: { eventId, userId: inviteUserId, role, status: "INVITED" },
    update: { role, status: "INVITED" },
  });

  revalidatePath(`/events/${eventId}`);
}

export async function respondGroupEventInvite(formData: FormData) {
  const user = await requirePlatformUser();
  const memberId = String(formData.get("memberId") ?? "");
  const accept = formData.get("accept") === "1";
  if (!memberId) return;

  const member = await prisma.groupEventMember.findUnique({
    where: { id: memberId },
    include: { event: true },
  });
  if (!member || member.userId !== user.id) return;

  await prisma.groupEventMember.update({
    where: { id: memberId },
    data: { status: accept ? "ACCEPTED" : "DECLINED" },
  });

  revalidatePath(`/events/${member.eventId}`);
}
