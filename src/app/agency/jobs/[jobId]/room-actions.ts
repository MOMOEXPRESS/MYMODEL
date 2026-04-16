"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RoomFileType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { uploadFile } from "@/lib/blob";

async function assertAccess(jobId: string) {
  const actor = await getSessionUser();
  if (!actor) throw new Error("UNAUTHORIZED");
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      agencyId: true,
      assignments: { select: { modelId: true, status: true } },
    },
  });
  if (!job) throw new Error("NOT_FOUND");

  // Agency staff in the same tenant → full access.
  if (actor.role === "AGENCY_STAFF" && actor.agencyId === job.agencyId) return actor;

  // Models who are CONFIRMED or OPTION on this job → read/write.
  if (actor.role === "MODEL") {
    const mine = job.assignments.find((a) => a.modelId === actor.id);
    if (mine && ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED", "DONE"].includes(mine.status)) {
      return actor;
    }
  }
  throw new Error("FORBIDDEN");
}

async function ensureRoom(jobId: string): Promise<string> {
  const room = await prisma.jobRoom.upsert({
    where: { jobId },
    create: { jobId },
    update: {},
  });
  return room.id;
}

// ── Files ──────────────────────────────────────────────────────────

export async function uploadRoomFile(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const typeRaw = String(formData.get("type") ?? "OTHER");
  const file = formData.get("file");

  const actor = await assertAccess(jobId);
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "No file" };
  }
  if (file.size > 25 * 1024 * 1024) {
    return { ok: false as const, error: "Max 25 MB" };
  }
  const type = (
    ["CALLSHEET", "BRIEF", "LOOKBOOK", "CONTRACT", "OTHER"].includes(typeRaw)
      ? typeRaw
      : "OTHER"
  ) as RoomFileType;

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { agencyId: true } });
  const uploaded = await uploadFile(file, {
    prefix: `agency/${job!.agencyId}/jobs/${jobId}`,
  });
  const roomId = await ensureRoom(jobId);

  await prisma.roomFile.create({
    data: {
      roomId,
      name: file.name,
      type,
      url: uploaded.url,
      uploadedByUserId: actor.id,
    },
  });

  // Notify confirmed models if call sheet posted.
  if (type === "CALLSHEET") {
    const confirmed = await prisma.jobAssignment.findMany({
      where: { jobId, status: "CONFIRMED" },
      select: { modelId: true },
    });
    if (confirmed.length > 0) {
      await prisma.notification.createMany({
        data: confirmed.map((c) => ({
          userId: c.modelId,
          type: "CALLSHEET",
          payload: { jobId, fileName: file.name },
        })),
      });
    }
  }

  revalidatePath(`/agency/jobs/${jobId}`);
  revalidatePath(`/m/jobs/${jobId}`);
  return { ok: true as const };
}

export async function deleteRoomFile(formData: FormData) {
  const fileId = String(formData.get("fileId") ?? "");
  const file = await prisma.roomFile.findUnique({
    where: { id: fileId },
    include: { room: { select: { jobId: true } } },
  });
  if (!file) return { ok: false as const, error: "Not found" };
  await assertAccess(file.room.jobId);
  await prisma.roomFile.delete({ where: { id: fileId } });
  revalidatePath(`/agency/jobs/${file.room.jobId}`);
  revalidatePath(`/m/jobs/${file.room.jobId}`);
  return { ok: true as const };
}

// ── Schedule ───────────────────────────────────────────────────────

const scheduleSchema = z.object({
  jobId: z.string().cuid(),
  title: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().max(8).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function addScheduleItem(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = scheduleSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  await assertAccess(d.jobId);
  const roomId = await ensureRoom(d.jobId);

  await prisma.roomScheduleItem.create({
    data: {
      roomId,
      title: d.title,
      date: new Date(d.date + "T00:00:00.000Z"),
      time: d.time ?? null,
      location: d.location ?? null,
      notes: d.notes ?? null,
    },
  });

  revalidatePath(`/agency/jobs/${d.jobId}`);
  revalidatePath(`/m/jobs/${d.jobId}`);
  return { ok: true as const };
}

export async function deleteScheduleItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const item = await prisma.roomScheduleItem.findUnique({
    where: { id: itemId },
    include: { room: { select: { jobId: true } } },
  });
  if (!item) return { ok: false as const, error: "Not found" };
  await assertAccess(item.room.jobId);
  await prisma.roomScheduleItem.delete({ where: { id: itemId } });
  revalidatePath(`/agency/jobs/${item.room.jobId}`);
  revalidatePath(`/m/jobs/${item.room.jobId}`);
  return { ok: true as const };
}

// ── Chat messages ──────────────────────────────────────────────────

export async function sendRoomMessage(input: { jobId: string; body: string }) {
  const actor = await assertAccess(input.jobId);
  const body = input.body.trim();
  if (!body || body.length > 4000) return { ok: false as const, error: "Invalid message" };

  const roomId = await ensureRoom(input.jobId);
  const msg = await prisma.message.create({
    data: {
      roomId,
      senderUserId: actor.id,
      body,
    },
    include: { sender: { select: { displayName: true, role: true } } },
  });
  return {
    ok: true as const,
    message: {
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      senderUserId: msg.senderUserId,
      senderName: msg.sender.displayName,
      senderRole: msg.sender.role,
    },
  };
}

export async function listRoomMessages(jobId: string) {
  await assertAccess(jobId);
  const room = await prisma.jobRoom.findUnique({ where: { jobId } });
  if (!room) return { ok: true as const, messages: [] };
  const msgs = await prisma.message.findMany({
    where: { roomId: room.id },
    include: { sender: { select: { displayName: true, role: true } } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  return {
    ok: true as const,
    messages: msgs.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderUserId: m.senderUserId,
      senderName: m.sender.displayName,
      senderRole: m.sender.role,
    })),
  };
}
