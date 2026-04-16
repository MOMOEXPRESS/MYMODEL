// Board helpers.
//
// Everything is UTC to avoid timezone-induced "off by one day" bugs on the
// server ↔ client boundary. Dates are represented as ISO YYYY-MM-DD strings
// at the API layer and as UTC Date objects server-side for Prisma queries.

export type CellStatus =
  | "AVAILABLE"
  | "OPTION_3"
  | "OPTION_2"
  | "OPTION_1"
  | "CONFIRMED"
  | "ON_JOB"
  | "TRAVELING"
  | "UNAVAILABLE";

/** Inclusive ISO date range at midnight UTC. */
export function utcDate(iso: string): Date {
  return new Date(iso + "T00:00:00.000Z");
}

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + n);
  return next;
}

export function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Build an inclusive sequence of ISO dates. */
export function datesBetween(from: Date, to: Date): string[] {
  const out: string[] = [];
  let cur = new Date(from);
  while (cur.getTime() <= to.getTime()) {
    out.push(iso(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/** A row's holds for fast lookup by date. */
export type BoardHold = {
  jobId: string;
  jobTitle: string;
  jobStatus: string;
  status: CellStatus; // derived from HoldPriority
  rate?: number | null;
  callTime?: string | null;
  wrapTime?: string | null;
};

export type BoardAvailability = "UNAVAILABLE" | "TRAVELING";

export type BoardRow = {
  modelId: string;
  name: string;
  division: string;
  status: string;
  /** holds[isoDate] may contain multiple entries from different jobs. */
  holds: Record<string, BoardHold[]>;
  /** availability[isoDate] */
  availability: Record<string, BoardAvailability>;
};

export type BoardPayload = {
  from: string;
  to: string;
  dates: string[];
  rows: BoardRow[];
};

/**
 * Pick the single status to render for a given cell given all the signals.
 * Precedence (highest to lowest, per brief §9):
 *   ON_JOB (the day of a confirmed job) > CONFIRMED > OPTION_1 > OPTION_2 >
 *   OPTION_3 > TRAVELING > UNAVAILABLE > AVAILABLE
 */
export function deriveCellStatus(
  holds: BoardHold[] | undefined,
  availability: BoardAvailability | undefined,
): CellStatus {
  if (holds && holds.length > 0) {
    const order: CellStatus[] = ["ON_JOB", "CONFIRMED", "OPTION_1", "OPTION_2", "OPTION_3"];
    for (const s of order) {
      if (holds.some((h) => h.status === s)) return s;
    }
  }
  if (availability === "TRAVELING") return "TRAVELING";
  if (availability === "UNAVAILABLE") return "UNAVAILABLE";
  return "AVAILABLE";
}

/** Map hold priority + job status to a CellStatus. */
export function holdToCellStatus(
  priority: "P1" | "P2" | "P3" | "CONFIRMED",
  jobStatus: string,
): CellStatus {
  if (priority === "CONFIRMED") {
    return jobStatus === "IN_PROGRESS" ? "ON_JOB" : "CONFIRMED";
  }
  if (priority === "P1") return "OPTION_1";
  if (priority === "P2") return "OPTION_2";
  return "OPTION_3";
}

/** Human month abbreviation for the top header. */
export function monthLabel(isoDate: string): string {
  const d = utcDate(isoDate);
  return d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

/** Mon..Sun, 1-letter. */
export function dowShort(isoDate: string): string {
  const d = utcDate(isoDate);
  // JS getUTCDay: 0=Sun..6=Sat — remap so Monday is first.
  return ["S", "M", "T", "W", "T", "F", "S"][d.getUTCDay()]!;
}

export function isWeekend(isoDate: string): boolean {
  const d = utcDate(isoDate).getUTCDay();
  return d === 0 || d === 6;
}

export function isToday(isoDate: string): boolean {
  return isoDate === iso(startOfTodayUTC());
}
