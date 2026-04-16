import { requireAgencyStaff } from "@/lib/auth-guards";
import { BoardClient } from "./board-client";
import { iso, startOfTodayUTC, addDays, datesBetween } from "@/lib/board";
import { prisma } from "@/lib/db";
import { Prisma, ModelStatus } from "@prisma/client";
import type { BoardPayload, BoardRow } from "@/lib/board";
import { holdToCellStatus } from "@/lib/board";

const DEFAULT_DAYS = 30;

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; division?: string; q?: string; from?: string }>;
}) {
  const user = await requireAgencyStaff();
  const sp = await searchParams;

  const days = clampDays(parseInt(sp.days ?? `${DEFAULT_DAYS}`, 10));
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)
    ? new Date(sp.from + "T00:00:00.000Z")
    : startOfTodayUTC();
  const to = addDays(from, days - 1);

  // Load the initial payload server-side so the page is fast on first paint.
  const initial = await loadBoard({
    agencyId: user.agencyId,
    from,
    to,
    division: sp.division,
    q: sp.q,
  });

  return (
    <BoardClient
      initial={initial}
      initialDays={days}
      initialFrom={iso(from)}
      initialDivision={sp.division ?? ""}
      initialQuery={sp.q ?? ""}
    />
  );
}

function clampDays(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  if (n <= 14) return 14;
  if (n <= 30) return 30;
  return 60;
}

async function loadBoard(opts: {
  agencyId: string;
  from: Date;
  to: Date;
  division?: string;
  q?: string;
}): Promise<BoardPayload> {
  const where: Prisma.ModelWhereInput = {
    agencyId: opts.agencyId,
    status: { not: ModelStatus.INACTIVE },
    ...(opts.division && ["WOMEN","MEN","CURVE","KIDS","TALENTS","NEW_FACES"].includes(opts.division)
      ? { division: opts.division as Prisma.ModelWhereInput["division"] }
      : {}),
    ...(opts.q && opts.q.trim().length > 0
      ? { user: { displayName: { contains: opts.q.trim(), mode: "insensitive" } } }
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
      where: { modelId: { in: modelIds }, date: { gte: opts.from, lte: opts.to } },
      include: { job: { select: { id: true, title: true, status: true } } },
    }),
    prisma.availability.findMany({
      where: { modelId: { in: modelIds }, date: { gte: opts.from, lte: opts.to } },
    }),
    // Per-(job, model) call/wrap times so we can decorate the Board cells.
    prisma.jobAssignment.findMany({
      where: { modelId: { in: modelIds } },
      select: { jobId: true, modelId: true, callTime: true, wrapTime: true },
    }),
  ]);
  const callTimeMap = new Map<string, { callTime: string | null; wrapTime: string | null }>();
  for (const a of assignments) {
    callTimeMap.set(`${a.jobId}:${a.modelId}`, {
      callTime: a.callTime,
      wrapTime: a.wrapTime,
    });
  }

  const rows = new Map<string, BoardRow>();
  for (const m of models) {
    rows.set(m.userId, {
      modelId: m.userId,
      name: m.user.displayName,
      division: m.division,
      status: m.status,
      holds: {},
      availability: {},
    });
  }
  for (const h of holds) {
    const r = rows.get(h.modelId);
    if (!r) continue;
    const k = iso(h.date);
    const timing = callTimeMap.get(`${h.job.id}:${h.modelId}`);
    (r.holds[k] ??= []).push({
      jobId: h.job.id,
      jobTitle: h.job.title,
      jobStatus: h.job.status,
      status: holdToCellStatus(h.priority, h.job.status),
      callTime: timing?.callTime ?? null,
      wrapTime: timing?.wrapTime ?? null,
    });
  }
  for (const a of availability) {
    const r = rows.get(a.modelId);
    if (!r || a.status === "AVAILABLE") continue;
    r.availability[iso(a.date)] = a.status as "UNAVAILABLE" | "TRAVELING";
  }

  return {
    from: iso(opts.from),
    to: iso(opts.to),
    dates: datesBetween(opts.from, opts.to),
    rows: Array.from(rows.values()),
  };
}
