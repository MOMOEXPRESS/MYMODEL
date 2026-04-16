"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { logEvent } from "@/lib/audit";

export async function markPayoutPaid(formData: FormData) {
  const user = await requireAgencyStaff();
  const id = String(formData.get("payoutId") ?? "");
  const payout = await prisma.modelPayout.findUnique({ where: { id } });
  if (!payout || payout.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  if (payout.status === "PAID") return { ok: true as const };
  await prisma.modelPayout.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
  const model = await prisma.user.findUnique({
    where: { id: payout.modelId },
    select: { displayName: true },
  });
  await prisma.notification.create({
    data: {
      userId: payout.modelId,
      type: "PAYOUT",
      payload: { amount: payout.net, currency: payout.currency },
    },
  });
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "payout.paid",
    entityType: "ModelPayout",
    entityId: id,
    summary: `Paid ${model?.displayName ?? "model"} ${payout.currency} ${payout.net.toFixed(2)}`,
  });
  revalidatePath("/agency/payouts");
  return { ok: true as const };
}
