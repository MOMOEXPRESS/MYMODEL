"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCreative } from "@/lib/auth-guards";
import type { CreativeSubtype } from "@prisma/client";

export async function updateCreativeProfile(formData: FormData) {
  const user = await requireCreative();
  await prisma.creativeProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      subtype: (formData.get("subtype") as CreativeSubtype) || "PHOTOGRAPHER",
      city: String(formData.get("city") || "") || null,
      bio: String(formData.get("bio") || "") || null,
      portfolioUrl: String(formData.get("portfolioUrl") || "") || null,
    },
    update: {
      subtype: (formData.get("subtype") as CreativeSubtype) || "PHOTOGRAPHER",
      city: String(formData.get("city") || "") || null,
      bio: String(formData.get("bio") || "") || null,
      portfolioUrl: String(formData.get("portfolioUrl") || "") || null,
    },
  });
  revalidatePath("/creative");
  revalidatePath("/creative/settings");
}
