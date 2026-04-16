import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { assertConversationMember } from "@/lib/conversations";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  try {
    await assertConversationMember(conversationId, user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { directConversationId: conversationId },
    include: { sender: { select: { id: true, displayName: true, role: true } } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  // Mark as read.
  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      senderUserId: m.senderUserId,
      senderName: m.sender.displayName,
      senderRole: m.sender.role,
    })),
  });
}

const sendSchema = z.object({ body: z.string().min(1).max(4000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  try {
    await assertConversationMember(conversationId, user.id);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const msg = await prisma.message.create({
    data: {
      directConversationId: conversationId,
      senderUserId: user.id,
      body: parsed.data.body,
    },
    include: { sender: { select: { displayName: true, role: true } } },
  });

  // Notify the other members.
  const others = await prisma.conversationMember.findMany({
    where: { conversationId, userId: { not: user.id } },
  });
  if (others.length > 0) {
    await prisma.notification.createMany({
      data: others.map((o) => ({
        userId: o.userId,
        type: "MESSAGE",
        payload: {
          conversationId,
          senderUserId: user.id,
          senderName: user.displayName,
          preview: parsed.data.body.slice(0, 120),
        },
      })),
    });
  }

  return NextResponse.json({
    message: {
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      senderUserId: msg.senderUserId,
      senderName: msg.sender.displayName,
      senderRole: msg.sender.role,
    },
  });
}
