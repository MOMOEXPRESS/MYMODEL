// GET /api/board?from=2026-04-15&to=2026-05-14&division=WOMEN&q=camille
//
// Returns one payload per board query (brief §9):
//   { from, to, dates: string[], rows: { modelId, name, division, status,
//     holds: Record<date, BoardHold[]>, availability: Record<date, "UNAVAILABLE"|"TRAVELING"> } }

import { NextResponse } from "next/server";
import { Prisma, Division, ModelStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  BoardPayload,
  BoardRow,
  datesBetween,
  holdToCellStatus,
  iso,
  utcDate,
} from "@/lib/board";

const DIVISIONS: Division[] = ["WOMEN", "MEN", "CURVE", "KIDS", "TALENTS", "NEW_FACES"];

export async function GET(req: Request) {
  const actor = await getSessionUser();
  if (!actor || actor.role !== "AGENCY_STAFF" || !actor.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const divRaw = url.searchParams.get("division");
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!fromStr || !toStr || !/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
    return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
  }
  const from = utcDate(fromStr);
  const to = utcDate(toStr);
  if (to.getTime() < from.getTime()) {
    return NextResponse.json({ error: "to must be >= from" }, { status: 400 });
  }
  // Cap the window at ~120 days to protect the server.
  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  if (spanDays > 120) {
    return NextResponse.json({ error: "Window too wide" }, { status: 400 });
  }

  const division = DIVISIONS.includes(divRaw as Division) ? (divRaw as Division) : undefined;

  const where: Prisma.ModelWhereInput = {
    agencyId: actor.agencyId,
    status: { not: ModelStatus.INACTIVE },
    ...(division ? { division } : {}),
    ...(q
      ? {
          user: {
            displayName: { contains: q, mode: "insensitive" },
          },
        }
      : {}),
  };

  const models = await prisma.model.findMany({
    where,
    include: { user: { select: { displayName: true } } },
    orderBy: { user: { displayName: "asc" } },
  });
  const modelIds = models.map((m) => m.userId);

  const [holds, availability, assignments] = await Promise.all([
    prisma.hold.findMany({
      where: {
        modelId: { in: modelIds },
        date: { gte: from, lte: to },
      },
      include: {
        job: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.availability.findMany({
      where: {
        modelId: { in: modelIds },
        date: { gte: from, lte: to },
      },
    }),
    prisma.jobAssignment.findMany({
      where: { modelId: { in: modelIds } },
      select: { jobId: true, modelId: true, callTime: true, wrapTime: true },
    }),
  ]);
  const timings = new Map<string, { callTime: string | null; wrapTime: string | null }>();
  for (const a of assignments) {
    timings.set(`${a.jobId}:${a.modelId}`, { callTime: a.callTime, wrapTime: a.wrapTime });
  }

  const rowsById = new Map<string, BoardRow>();
  for (const m of models) {
    rowsById.set(m.userId, {
      modelId: m.userId,
      name: m.user.displayName,
      division: m.division,
      status: m.status,
      holds: {},
      availability: {},
    });
  }

  for (const h of holds) {
    const row = rowsById.get(h.modelId);
    if (!row) continue;
    const dateIso = iso(h.date);
    const timing = timings.get(`${h.job.id}:${h.modelId}`);
    const cell = (row.holds[dateIso] ??= []);
    cell.push({
      jobId: h.job.id,
      jobTitle: h.job.title,
      jobStatus: h.job.status,
      status: holdToCellStatus(h.priority, h.job.status),
      callTime: timing?.callTime ?? null,
      wrapTime: timing?.wrapTime ?? null,
    });
  }

  for (const a of availability) {
    const row = rowsById.get(a.modelId);
    if (!row) continue;
    if (a.status === "AVAILABLE") continue;
    row.availability[iso(a.date)] = a.status as "UNAVAILABLE" | "TRAVELING";
  }

  const payload: BoardPayload = {
    from: fromStr,
    to: toStr,
    dates: datesBetween(from, to),
    rows: Array.from(rowsById.values()),
  };
  return NextResponse.json(payload);
}
