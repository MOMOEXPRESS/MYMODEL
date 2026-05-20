import { prisma } from "@/lib/db";

/** Link agency CRM Client rows to a platform user by matching email. */
export async function linkAgencyClientsByEmail(userId: string, email: string) {
  const normalized = email.toLowerCase().trim();
  await prisma.client.updateMany({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      platformUserId: null,
    },
    data: { platformUserId: userId },
  });
}

/** Link one CRM client row to a platform user by email, if a CLIENT user exists. */
export async function syncClientPlatformLink(clientId: string, email: string) {
  const platformUser = await prisma.user.findFirst({
    where: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" }, role: "CLIENT" },
    select: { id: true },
  });
  if (platformUser) {
    await prisma.client.update({
      where: { id: clientId },
      data: { platformUserId: platformUser.id },
    });
  }
}

export async function tryLinkClientOnEnablePortal(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client || client.platformUserId) return;
  const user = await prisma.user.findFirst({
    where: { email: { equals: client.email, mode: "insensitive" }, role: "CLIENT" },
    select: { id: true },
  });
  if (user) {
    await prisma.client.update({
      where: { id: clientId },
      data: { platformUserId: user.id },
    });
  }
}
