// POST /api/scouted/[code]  multipart form-data
// Public endpoint — no auth. Creates a Prospect scoped to the agency whose
// signupCode matches. Rate-limited so the agency's scouting link can't be
// used as a spam target.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, ipFromRequest } from "@/lib/rate-limit";
import { uploadFile, UploadError } from "@/lib/blob";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().max(40).optional().nullable(),
  instagramHandle: z.string().max(60).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  source: z.string().max(80).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const ip = ipFromRequest(req);
  // Rate-limit per code + IP so a single booth can't be DOS'd.
  const byCode = await checkRateLimit("signup", `scout:${code.toUpperCase()}`);
  const byIp = await checkRateLimit("signup", `scout-ip:${ip}`);
  if (!byCode.success || !byIp.success) {
    return NextResponse.json({ error: "Too many submissions — try again later." }, { status: 429 });
  }

  const agency = await prisma.agency.findUnique({
    where: { signupCode: code.toUpperCase() },
    select: { id: true, users: { where: { role: "AGENCY_STAFF" }, take: 1, select: { id: true } } },
  });
  if (!agency) return NextResponse.json({ error: "Unknown agency code" }, { status: 404 });

  const fd = await req.formData();
  const raw: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k === "image") continue;
    raw[k] = v === "" ? null : v;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const file = fd.get("image");
  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Image only" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 10 MB" }, { status: 400 });
    }
    try {
      const uploaded = await uploadFile(file, {
        prefix: `agency/${agency.id}/scouted`,
      });
      imageUrl = uploaded.url;
    } catch (err) {
      if (err instanceof UploadError) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      throw err;
    }
  }

  // `createdByUserId` is required on Prospect — attribute self-submissions
  // to the first agency staff user we can find. It's just a fallback; the
  // UI labels the source as "Open casting (self-submitted)".
  const attributeTo = agency.users[0]?.id ?? null;
  if (!attributeTo) {
    return NextResponse.json({ error: "Agency has no staff yet" }, { status: 400 });
  }

  const prospect = await prisma.prospect.create({
    data: {
      agencyId: agency.id,
      createdByUserId: attributeTo,
      name: d.name,
      email: d.email ?? null,
      phone: d.phone ?? null,
      instagramHandle: d.instagramHandle ?? null,
      city: d.city ?? null,
      source: d.source ?? "Self-submitted",
      notes: d.notes ?? null,
      imageUrl,
      status: "NEW",
    },
  });

  // Notify every staff member so someone reviews.
  const staff = await prisma.user.findMany({
    where: { agencyId: agency.id, role: "AGENCY_STAFF" },
    select: { id: true },
  });
  if (staff.length > 0) {
    await prisma.notification.createMany({
      data: staff.map((s) => ({
        userId: s.id,
        type: "SCOUTED_SUBMISSION",
        payload: {
          prospectId: prospect.id,
          name: d.name,
          source: d.source ?? "Self-submitted",
        },
      })),
    });
  }

  return NextResponse.json({ ok: true, prospectId: prospect.id });
}
