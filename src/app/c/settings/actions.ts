"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth-guards";
import type { ClientSubtype } from "@prisma/client";

const schema = z.object({
  companyName: z.string().max(120).optional(),
  subtype: z.string(),
  city: z.string().max(80).optional(),
  bio: z.string().max(2000).optional(),
  websiteUrl: z.string().max(300).optional(),
});

export async function updateClientProfile(formData: FormData) {
  const user = await requireClient();
  const parsed = schema.safeParse({
    companyName: formData.get("companyName") || undefined,
    subtype: formData.get("subtype"),
    city: formData.get("city") || undefined,
    bio: formData.get("bio") || undefined,
    websiteUrl: formData.get("websiteUrl") || undefined,
  });
  if (!parsed.success) return;

  await prisma.clientProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      subtype: parsed.data.subtype as ClientSubtype,
      companyName: parsed.data.companyName,
      city: parsed.data.city,
      bio: parsed.data.bio,
      websiteUrl: parsed.data.websiteUrl,
    },
    update: {
      subtype: parsed.data.subtype as ClientSubtype,
      companyName: parsed.data.companyName,
      city: parsed.data.city,
      bio: parsed.data.bio,
      websiteUrl: parsed.data.websiteUrl,
    },
  });

  revalidatePath("/c/settings");
  revalidatePath("/c");
}
