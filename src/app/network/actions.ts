"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/auth-guards";
import { canUserReceiveConnectionRequest } from "@/lib/network";

export async function sendConnectionRequest(formData: FormData) {
  const user = await requirePlatformUser();
  const toUserId = String(formData.get("toUserId") ?? "");
  const message = String(formData.get("message") ?? "").trim() || null;
  if (!toUserId) return;

  const gate = await canUserReceiveConnectionRequest(toUserId, user.id);
  if (!gate.ok) return;

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { fromUserId: user.id, toUserId },
        { fromUserId: toUserId, toUserId: user.id },
      ],
    },
  });
  if (existing?.status === "ACCEPTED") return;
  if (existing?.status === "BLOCKED") return;
  if (existing?.status === "PENDING") return;

  await prisma.connection.create({
    data: { fromUserId: user.id, toUserId, message, status: "PENDING" },
  });

  revalidatePath("/network");
}

export async function respondConnection(formData: FormData) {
  const user = await requirePlatformUser();
  const connectionId = String(formData.get("connectionId") ?? "");
  const accept = formData.get("accept") === "1";
  if (!connectionId) return;

  const conn = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.toUserId !== user.id || conn.status !== "PENDING") {
    return;
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: accept ? "ACCEPTED" : "BLOCKED",
      respondedAt: new Date(),
    },
  });

  revalidatePath("/network");
}
