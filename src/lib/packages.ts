import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export function mintPackageToken(): string {
  return randomBytes(18).toString("base64url");
}

export function packagePublicUrl(token: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${origin}/package/${token}`;
}

/** Record a view event (Frava-style package analytics). */
export async function recordPackageView(packageId: string, viewerHint?: string): Promise<void> {
  await prisma.$transaction([
    prisma.talentPackageView.create({
      data: { packageId, viewerHint: viewerHint ?? null },
    }),
    prisma.talentPackage.update({
      where: { id: packageId },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export async function packageViewStats(packageId: string) {
  const [total, last] = await Promise.all([
    prisma.talentPackageView.count({ where: { packageId } }),
    prisma.talentPackageView.findFirst({
      where: { packageId },
      orderBy: { viewedAt: "desc" },
      select: { viewedAt: true },
    }),
  ]);
  return { total, lastViewedAt: last?.viewedAt ?? null };
}
