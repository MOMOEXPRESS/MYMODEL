// GET /api/earnings/[modelId]/pdf?year=2026&month=04
// Renders a monthly earnings statement for one model: DONE jobs in the period
// with gross rate, commission, and net-to-model.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#0B0B0C" },
  h1: { fontSize: 20, fontFamily: "Times-Roman" },
  label: { fontSize: 8, color: "#8A8A92", textTransform: "uppercase", letterSpacing: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  right: { textAlign: "right", fontSize: 9, color: "#54545A" },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #E7E5DF",
    paddingBottom: 4,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    color: "#8A8A92",
  },
  row: { flexDirection: "row", paddingVertical: 4, borderBottom: "1px solid #E7E5DF" },
  colJob: { flex: 2 },
  col: { width: 80, textAlign: "right" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, fontSize: 12 },
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const actor = await getSessionUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { modelId } = await params;

  const model = await prisma.model.findUnique({
    where: { userId: modelId },
    include: { user: { select: { displayName: true } }, agency: true },
  });
  if (!model) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sameAgency =
    actor.role === "AGENCY_STAFF" && actor.agencyId === model.agencyId;
  const isSelf = actor.role === "MODEL" && actor.id === model.userId;
  if (!sameAgency && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? `${new Date().getUTCFullYear()}`, 10);
  const month = parseInt(
    url.searchParams.get("month") ?? `${new Date().getUTCMonth() + 1}`,
    10,
  );
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      modelId,
      status: "DONE",
      job: { endDate: { gte: from, lte: to } },
    },
    include: {
      job: { select: { title: true, startDate: true, endDate: true, defaultRate: true, currency: true, rateType: true } },
    },
    orderBy: { job: { endDate: "asc" } },
  });

  const commissionPct = model.commissionPercent ?? model.agency.defaultCommissionPercent;

  type Row = {
    date: string;
    title: string;
    qty: number;
    unit: number;
    gross: number;
    commission: number;
    net: number;
  };

  const rows: Row[] = assignments.map((a) => {
    const rate = a.rate ?? a.job.defaultRate ?? 0;
    const rateType = a.rateType ?? a.job.rateType;
    const days = Math.max(
      1,
      Math.round((a.job.endDate.getTime() - a.job.startDate.getTime()) / 86400000) + 1,
    );
    const qty = rateType === "DAY" ? days : 1;
    const gross = rate * qty;
    const commission = gross * (commissionPct / 100);
    const net = gross - commission;
    return {
      date: a.job.endDate.toISOString().slice(0, 10),
      title: a.job.title,
      qty,
      unit: rate,
      gross,
      commission,
      net,
    };
  });

  const gross = rows.reduce((s, r) => s + r.gross, 0);
  const commission = rows.reduce((s, r) => s + r.commission, 0);
  const net = rows.reduce((s, r) => s + r.net, 0);

  const currency = model.agency.currency;

  const buffer = await renderToBuffer(
    <Document title={`Earnings ${year}-${String(month).padStart(2, "0")}`} author={model.agency.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>Earnings statement</Text>
            <Text style={styles.h1}>{model.user.displayName}</Text>
            <Text style={{ fontSize: 9, color: "#54545A", marginTop: 4 }}>
              {from.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
          </View>
          <View style={styles.right}>
            <Text>{model.agency.name}</Text>
            {model.agency.siret ? <Text>SIRET {model.agency.siret}</Text> : null}
            <Text>Commission: {commissionPct}%</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colJob}>Job</Text>
          <Text style={styles.col}>Finished</Text>
          <Text style={styles.col}>Gross</Text>
          <Text style={styles.col}>Commission</Text>
          <Text style={styles.col}>Net</Text>
        </View>

        {rows.length === 0 ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: "#8A8A92" }}>No completed jobs in this period.</Text>
          </View>
        ) : (
          rows.map((r, i) => (
            <View style={styles.row} key={i}>
              <Text style={styles.colJob}>{r.title}</Text>
              <Text style={styles.col}>{r.date}</Text>
              <Text style={styles.col}>{currency} {r.gross.toFixed(2)}</Text>
              <Text style={styles.col}>−{currency} {r.commission.toFixed(2)}</Text>
              <Text style={styles.col}>{currency} {r.net.toFixed(2)}</Text>
            </View>
          ))
        )}

        <View style={{ marginTop: 18, alignSelf: "flex-end", width: 240 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 2 }}>
            <Text style={{ color: "#54545A" }}>Gross total</Text>
            <Text>{currency} {gross.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 2 }}>
            <Text style={{ color: "#54545A" }}>Agency commission</Text>
            <Text>−{currency} {commission.toFixed(2)}</Text>
          </View>
          <View style={{ ...styles.grandTotalRow, borderTop: "1px solid #0B0B0C", paddingTop: 6 }}>
            <Text>Net to you</Text>
            <Text>{currency} {net.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={{ marginTop: 36, fontSize: 8, color: "#8A8A92" }}>
          Generated by LuxLane · {new Date().toLocaleString("en-US")}
        </Text>
      </Page>
    </Document>,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="Earnings ${model.user.displayName.replace(
        /[^\w\-. ]+/g,
        "_",
      )} ${year}-${String(month).padStart(2, "0")}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
