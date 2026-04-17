// POST /api/pitch-deck
// Body: { modelIds: string[], title?: string }
// Returns a multi-page PDF with one model per page — compact comp-card layout
// designed for pitching a selection to a casting director. Bookers reach for
// this once or twice a week and currently assemble it in Keynote. Now it's
// one click.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    color: "#0B0B0C",
    backgroundColor: "#FAFAF7",
  },
  cover: {
    padding: 60,
    fontFamily: "Helvetica",
    color: "#0B0B0C",
    backgroundColor: "#0B0B0C",
  },
  coverAgency: {
    fontSize: 10,
    letterSpacing: 3,
    color: "#8A8A90",
    textTransform: "uppercase",
    marginTop: 40,
  },
  coverTitle: {
    fontSize: 42,
    fontFamily: "Times-Roman",
    color: "#FAFAF7",
    marginTop: 16,
  },
  coverMeta: {
    fontSize: 10,
    color: "#8A8A90",
    marginTop: 320,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    borderBottom: "1 solid #0B0B0C",
    paddingBottom: 8,
  },
  modelName: {
    fontSize: 22,
    fontFamily: "Times-Roman",
  },
  division: {
    fontSize: 8,
    letterSpacing: 2,
    color: "#54545A",
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tile: {
    width: "49%",
    height: 240,
    backgroundColor: "#E8E8E3",
    marginBottom: 6,
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  footer: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#54545A",
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 9,
    color: "#0B0B0C",
  },
});

type ModelForDeck = {
  userId: string;
  displayName: string;
  division: string;
  measurements: Record<string, unknown>;
  images: string[];
};

function statLine(m: Record<string, unknown>): string {
  const parts: string[] = [];
  if (m.heightCm) parts.push(`H ${m.heightCm}cm`);
  if (m.bustCm) parts.push(`B ${m.bustCm}`);
  if (m.waistCm) parts.push(`W ${m.waistCm}`);
  if (m.hipsCm) parts.push(`Hp ${m.hipsCm}`);
  if (m.shoeEu) parts.push(`Shoe ${m.shoeEu}`);
  if (m.hair) parts.push(String(m.hair));
  if (m.eyes) parts.push(String(m.eyes));
  return parts.join(" · ");
}

function ModelPage({ m }: { m: ModelForDeck }) {
  const tiles = m.images.slice(0, 4);
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.division}>{m.division.replace("_", " ")}</Text>
          <Text style={styles.modelName}>{m.displayName}</Text>
        </View>
        <View>
          <Text style={styles.division}>{statLine(m.measurements) || "—"}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {tiles.map((url, i) => (
          <View key={i} style={styles.tile}>
            <Image src={url} style={styles.img} />
          </View>
        ))}
      </View>
    </Page>
  );
}

function absoluteUrl(req: Request, url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  const origin = new URL(req.url).origin;
  return new URL(url, origin).toString();
}

export async function POST(req: Request) {
  const user = await requireAgencyStaff();
  const body = await req.json().catch(() => null);
  const modelIds: string[] = Array.isArray(body?.modelIds) ? body.modelIds : [];
  const title: string = typeof body?.title === "string" && body.title.length ? body.title : "Pitch";
  if (modelIds.length === 0 || modelIds.length > 40) {
    return NextResponse.json({ error: "Pick 1–40 models" }, { status: 400 });
  }

  const models = await prisma.model.findMany({
    where: { userId: { in: modelIds }, agencyId: user.agencyId },
    include: {
      user: { select: { displayName: true } },
      portfolio: { where: { kind: { not: "VIDEO" } }, orderBy: { order: "asc" }, take: 4 },
    },
  });

  // Preserve the input order.
  const sorted = modelIds
    .map((id) => models.find((m) => m.userId === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const prepared: ModelForDeck[] = sorted.map((m) => ({
    userId: m.userId,
    displayName: m.user.displayName,
    division: m.division,
    measurements: (m.measurements ?? {}) as Record<string, unknown>,
    images: m.portfolio.map((p) => absoluteUrl(req, p.url)),
  }));

  const buffer = await renderToBuffer(
    <Document>
      <Page size="A4" style={styles.cover}>
        <Text style={styles.coverAgency}>{user.agency.name}</Text>
        <Text style={styles.coverTitle}>{title}</Text>
        <Text style={styles.coverMeta}>
          {prepared.length} model{prepared.length === 1 ? "" : "s"} · {new Date().toLocaleDateString()}
        </Text>
      </Page>
      {prepared.map((m) => (
        <ModelPage key={m.userId} m={m} />
      ))}
    </Document>,
  );

  const safeTitle = title.replace(/[^\w\-. ]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${safeTitle}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
