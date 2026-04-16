// GET /api/compcard/[modelId]/png?imageIds=a,b,c
// Returns the model's comp card as a PNG (same layout as the PDF version,
// rendered with Satori via Next's ImageResponse).
//
// Satori is more limited than regular CSS — no complex gap, no flex-wrap on
// fixed widths without caveats — so the layout here is intentionally simple
// and explicit.

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { statLines, type CompCardData } from "@/lib/compcard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WIDTH = 1240;  // ~A4 @ ~150dpi, portrait
const HEIGHT = 1754;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const actor = await getSessionUser();
  if (!actor) return new Response("Unauthorized", { status: 401 });

  const { modelId } = await params;
  const model = await prisma.model.findUnique({
    where: { userId: modelId },
    include: {
      user: { select: { displayName: true } },
      agency: true,
      portfolio: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
    },
  });
  if (!model) return new Response("Not found", { status: 404 });

  const sameAgency =
    actor.role === "AGENCY_STAFF" && actor.agencyId === model.agencyId;
  const isSelf = actor.role === "MODEL" && actor.id === model.userId;
  if (!sameAgency && !isSelf) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const imageIdsParam =
    url.searchParams.get("imageIds")?.split(",").filter(Boolean) ?? [];

  const byId = new Map(model.portfolio.map((p) => [p.id, p]));
  const picked =
    imageIdsParam.length > 0
      ? imageIdsParam
          .map((id) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .filter((p) => p.kind !== "VIDEO")
      : model.portfolio.filter((p) => p.kind !== "VIDEO").slice(0, 5);

  const imageUrls = picked.map((p) => absoluteUrl(req, p.url));
  const [hero, ...thumbs] = imageUrls;

  const measurements = (model.measurements ?? {}) as CompCardData["measurements"];
  const stats = statLines(measurements);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#FAFAF7",
          padding: 56,
          display: "flex",
          flexDirection: "column",
          color: "#0B0B0C",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 16,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#54545A",
              }}
            >
              {model.agency.name}
            </div>
            <div
              style={{
                fontSize: 56,
                fontFamily: "serif",
                marginTop: 4,
                lineHeight: 1,
              }}
            >
              {model.user.displayName}
            </div>
            <div
              style={{
                fontSize: 14,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#8A8A92",
                marginTop: 8,
              }}
            >
              {model.division.replace("_", " ")}
            </div>
          </div>
          {model.agency.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.agency.logoUrl}
              width={100}
              height={100}
              style={{ objectFit: "contain" }}
              alt=""
            />
          ) : (
            <div
              style={{
                fontSize: 14,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: "#8A8A92",
              }}
            >
              {model.agency.city ?? ""}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 24 }}>
          <div
            style={{
              flex: 2,
              backgroundColor: "#EEEAE1",
              overflow: "hidden",
              display: "flex",
            }}
          >
            {hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero}
                width="100%"
                height="100%"
                style={{ objectFit: "cover" }}
                alt=""
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#8A8A92",
                  fontSize: 16,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  width: "100%",
                }}
              >
                No photo
              </div>
            )}
          </div>

          <div
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {thumbs.slice(0, 4).map((u, i) => (
                <div
                  key={i}
                  style={{
                    width: "calc(50% - 6px)",
                    height: 220,
                    backgroundColor: "#EEEAE1",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    width="100%"
                    height="100%"
                    style={{ objectFit: "cover" }}
                    alt=""
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "auto",
                borderTop: "1px solid #E7E5DF",
                paddingTop: 16,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "4px 0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      color: "#8A8A92",
                    }}
                  >
                    {s.label}
                  </div>
                  <div style={{ fontSize: 16 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 12,
            color: "#8A8A92",
            justifyContent: "flex-end",
          }}
        >
          {`${model.agency.name}${model.agency.city ? ` · ${model.agency.city}` : ""} · luxlane.app`}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "content-type": "image/png",
        "content-disposition": `inline; filename="${safeFilename(
          model.user.displayName,
        )} - Comp card.png"`,
        "cache-control": "private, no-store",
      },
    },
  );
}

function absoluteUrl(req: Request, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const origin = new URL(req.url).origin;
  return new URL(url, origin).toString();
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\-. ]+/g, "_");
}
