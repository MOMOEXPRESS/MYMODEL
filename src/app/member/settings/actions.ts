"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireMember } from "@/lib/auth-guards";

export async function updateMemberProfile(formData: FormData) {
  const user = await requireMember();
  await prisma.memberProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      city: String(formData.get("city") || "") || null,
      bio: String(formData.get("bio") || "") || null,
    },
    update: {
      city: String(formData.get("city") || "") || null,
      bio: String(formData.get("bio") || "") || null,
    },
  });
  revalidatePath("/member");
  revalidatePath("/member/settings");
}
