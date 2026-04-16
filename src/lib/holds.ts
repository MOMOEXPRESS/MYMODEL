// Hold synchronization.
//
// Holds are denormalized from JobAssignments + the parent Job's date range,
// so that the Board can query "what's on model X's date Y" in one index hit
// instead of scanning every job.
//
// Rule of thumb:
//   - Every time a JobAssignment is created, updated, or deleted, call
//     `syncHoldsForJob(jobId)`. It rewrites the Hold rows for that job from
//     scratch. Cheap: holds are (modelId, date, jobId) with a handful of
//     rows per assignment.
//   - Every time a Job's dates change, call `syncHoldsForJob(jobId)` too.
//
// Priority mapping (brief §5 + §9):
//   PROPOSED / DECLINED / RELEASED / DONE → no hold (the model's calendar is
//     free as far as the Board is concerned).
//   OPTION_1 / OPTION_2 / OPTION_3 → hold with the matching priority.
//   CONFIRMED → hold with priority=CONFIRMED, which renders as green / on-job.

import {
  AssignmentStatus,
  HoldPriority,
  HoldStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "./db";
import { addDays, utcDate } from "./board";

function priorityFor(status: AssignmentStatus): HoldPriority | null {
  switch (status) {
    case "OPTION_1":
      return "P1";
    case "OPTION_2":
      return "P2";
    case "OPTION_3":
      return "P3";
    case "CONFIRMED":
      return "CONFIRMED";
    default:
      return null; // PROPOSED / DECLINED / RELEASED / DONE — no hold row
  }
}

/**
 * Rebuild Hold rows for every assignment on the given job.
 * Runs in a single transaction so the Board never sees a half-synced state.
 */
export async function syncHoldsForJob(jobId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const job = await tx.job.findUnique({
      where: { id: jobId },
      include: { assignments: true },
    });
    if (!job) return;

    await tx.hold.deleteMany({ where: { jobId } });

    // Inclusive date range [startDate..endDate].
    const startIso = job.startDate.toISOString().slice(0, 10);
    const endIso = job.endDate.toISOString().slice(0, 10);
    const start = utcDate(startIso);
    const end = utcDate(endIso);

    const rows: Prisma.HoldCreateManyInput[] = [];
    for (const a of job.assignments) {
      const priority = priorityFor(a.status);
      if (!priority) continue;
      const status: HoldStatus = priority === "CONFIRMED" ? "CONFIRMED" : "HELD";
      let d = start;
      while (d.getTime() <= end.getTime()) {
        rows.push({
          modelId: a.modelId,
          jobId,
          date: d,
          priority,
          status,
        });
        d = addDays(d, 1);
      }
    }
    if (rows.length > 0) {
      await tx.hold.createMany({ data: rows, skipDuplicates: true });
    }
  });
}

/**
 * Look for any existing CONFIRMED hold on another job that would collide
 * with a *proposed* assignment. Used to warn (not block) the booker.
 *
 * Returns a list of { jobId, jobTitle, dates[] } entries.
 */
export type Conflict = {
  jobId: string;
  jobTitle: string;
  dates: string[];
};

export async function detectConflicts(opts: {
  agencyId: string;
  modelId: string;
  jobId: string; // current job — excluded from the check
  startDate: Date;
  endDate: Date;
  assumingStatus: AssignmentStatus;
}): Promise<Conflict[]> {
  // Only worth checking if the pending change would result in a hold.
  const pendingPriority = priorityFor(opts.assumingStatus);
  if (!pendingPriority) return [];

  // We warn when confirming against any existing CONFIRMED on other jobs.
  // Option-vs-option is fine (multiple options across jobs is normal).
  if (pendingPriority !== "CONFIRMED") return [];

  const clashes = await prisma.hold.findMany({
    where: {
      modelId: opts.modelId,
      jobId: { not: opts.jobId },
      priority: "CONFIRMED",
      date: { gte: opts.startDate, lte: opts.endDate },
    },
    include: {
      job: { select: { id: true, title: true, agencyId: true } },
    },
    orderBy: { date: "asc" },
  });

  const byJob = new Map<string, Conflict>();
  for (const h of clashes) {
    if (h.job.agencyId !== opts.agencyId) continue; // tenant guard
    const entry = byJob.get(h.jobId) ?? {
      jobId: h.job.id,
      jobTitle: h.job.title,
      dates: [],
    };
    entry.dates.push(h.date.toISOString().slice(0, 10));
    byJob.set(h.jobId, entry);
  }
  return Array.from(byJob.values());
}
