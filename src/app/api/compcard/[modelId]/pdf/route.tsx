// GET /api/compcard/[modelId]/pdf?imageIds=a,b,c&template=CLASSIC
// Returns the model's comp card as application/pdf.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CompCardDocument } from "../compcard-pdf";
import type { CompCardData, CompCardTemplate } from "@/lib/compcard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { modelId } = await params;
  const model = await prisma.model.findUnique({
    where: { userId: modelId },
    include: {
      user: { select: { displayName: true } },
      agency: true,
      portfolio: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
    },
  });
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Tenant guard.
  const sameAgency =
    actor.role === "AGENCY_STAFF" && actor.agencyId === model.agencyId;
  const isSelf = actor.role === "MODEL" && actor.id === model.userId;
  if (!sameAgency && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const imageIdsParam = url.searchParams.get("imageIds")?.split(",").filter(Boolean) ?? [];
  const template = ((url.searchParams.get("template") ?? "CLASSIC") as CompCardTemplate);

  // If no explicit ids, take up to 5 book photos in curated order.
  const imageUrls = (() => {
    const byId = new Map(model.portfolio.map((p) => [p.id, p]));
    if (imageIdsParam.length > 0) {
      return imageIdsParam
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .filter((p) => p.kind !== "VIDEO")
        .map((p) => absoluteUrl(req, p.url))
        .slice(0, 6);
    }
    return model.portfolio
      .filter((p) => p.kind !== "VIDEO")
      .slice(0, 5)
      .map((p) => absoluteUrl(req, p.url));
  })();

  const measurements = (model.measurements ?? {}) as CompCardData["measurements"];

  const data: CompCardData = {
    agencyName: model.agency.name,
    agencyLogoUrl: model.agency.logoUrl ?? null,
    agencyCity: model.agency.city ?? null,
    modelName: model.user.displayName,
    division: model.division,
    measurements,
    imageUrls,
    template,
  };

  const buffer = await renderToBuffer(<CompCardDocument data={data} />);

  const safeName = model.user.displayName.replace(/[^\w\-. ]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${safeName} - Comp card.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}

/** Resolve /uploads/... → absolute URL so @react-pdf/renderer can fetch it. */
function absoluteUrl(req: Request, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const origin = new URL(req.url).origin;
  return new URL(url, origin).toString();
}
