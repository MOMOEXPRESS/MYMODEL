// 1:1 conversations between an agency (represented by its staff) and one of
// its models. For v1 we collapse "agency" into a single multi-member thread:
// every staff who has ever messaged the model is a member, plus the model.
// From the model's side it's one inbox per agency.

import { prisma } from "./db";

export type ConversationSummary = {
  id: string;
  modelUserId: string;
  modelName: string;
  modelDivision: string;
  lastMessage: {
    body: string;
    createdAt: Date;
    senderUserId: string;
    senderName: string;
  } | null;
  unreadForMe: boolean;
};

/**
 * Find or create the agency↔model conversation.
 * Ensures the staff caller is a member (lazy join).
 */
export async function getOrCreateConversation(opts: {
  agencyId: string;
  staffUserId: string;
  modelUserId: string;
}): Promise<string> {
  // Confirm the model belongs to the agency.
  const model = await prisma.model.findUnique({
    where: { userId: opts.modelUserId },
    select: { agencyId: true },
  });
  if (!model || model.agencyId !== opts.agencyId) {
    throw new Error("FORBIDDEN");
  }

  // Look for an existing conversation with this model + any staff of this agency.
  const existing = await prisma.directConversation.findFirst({
    where: {
      members: { some: { userId: opts.modelUserId } },
      AND: {
        members: {
          some: {
            user: { role: "AGENCY_STAFF", agencyId: opts.agencyId },
          },
        },
      },
    },
    include: { members: true },
  });

  if (existing) {
    const alreadyMember = existing.members.some((m) => m.userId === opts.staffUserId);
    if (!alreadyMember) {
      await prisma.conversationMember.create({
        data: { conversationId: existing.id, userId: opts.staffUserId },
      });
    }
    return existing.id;
  }

  const conv = await prisma.directConversation.create({
    data: {
      members: {
        create: [{ userId: opts.staffUserId }, { userId: opts.modelUserId }],
      },
    },
  });
  return conv.id;
}

/** List conversations visible to an agency staff user (threads with the agency's models). */
export async function listAgencyConversations(opts: {
  agencyId: string;
  staffUserId: string;
}): Promise<ConversationSummary[]> {
  const convos = await prisma.directConversation.findMany({
    where: {
      members: {
        some: {
          user: { role: "AGENCY_STAFF", agencyId: opts.agencyId },
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, displayName: true, role: true },
          },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const summaries: ConversationSummary[] = [];
  for (const c of convos) {
    const modelMember = c.members.find((m) => m.user.role === "MODEL");
    if (!modelMember) continue;
    const model = await prisma.model.findUnique({
      where: { userId: modelMember.userId },
      select: { agencyId: true, division: true },
    });
    if (!model || model.agencyId !== opts.agencyId) continue;

    const last = c.messages[0];
    const me = c.members.find((m) => m.userId === opts.staffUserId);
    const unread = Boolean(
      last && last.senderUserId !== opts.staffUserId && (!me?.lastReadAt || last.createdAt > me.lastReadAt),
    );

    summaries.push({
      id: c.id,
      modelUserId: modelMember.userId,
      modelName: modelMember.user.displayName,
      modelDivision: model.division,
      lastMessage: last
        ? {
            body: last.body,
            createdAt: last.createdAt,
            senderUserId: last.senderUserId,
            senderName:
              c.members.find((m) => m.userId === last.senderUserId)?.user.displayName ??
              "Unknown",
          }
        : null,
      unreadForMe: unread,
    });
  }

  summaries.sort((a, b) => {
    const aT = a.lastMessage?.createdAt.getTime() ?? 0;
    const bT = b.lastMessage?.createdAt.getTime() ?? 0;
    return bT - aT;
  });
  return summaries;
}

/** Get (or create) conversation for the model user. Returns their single agency conversation. */
export async function getModelConversation(modelUserId: string): Promise<string | null> {
  const model = await prisma.model.findUnique({
    where: { userId: modelUserId },
    select: { agencyId: true },
  });
  if (!model) return null;

  const conv = await prisma.directConversation.findFirst({
    where: {
      members: { some: { userId: modelUserId } },
      AND: {
        members: {
          some: { user: { role: "AGENCY_STAFF", agencyId: model.agencyId } },
        },
      },
    },
  });
  return conv?.id ?? null;
}

/** Ensure the caller is a member before touching a conversation. */
export async function assertConversationMember(conversationId: string, userId: string): Promise<void> {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new Error("FORBIDDEN");
}
