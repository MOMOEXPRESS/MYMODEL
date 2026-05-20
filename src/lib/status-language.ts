import type { CellStatus } from "@/lib/board";

/** Simple labels shown by default across the product. */
export type SimpleStatus = "available" | "on_hold" | "confirmed" | "away" | "on_set";

export const SIMPLE_STATUS_LABEL: Record<SimpleStatus, string> = {
  available: "Available",
  on_hold: "On hold",
  confirmed: "Confirmed",
  away: "Away",
  on_set: "On set",
};

export const SIMPLE_STATUS_HELP: Record<SimpleStatus, string> = {
  available: "Open for bookings on this day.",
  on_hold: "Held for a job — not confirmed yet.",
  confirmed: "Booked and locked for a job.",
  away: "Off or traveling — not available.",
  on_set: "Working on a confirmed job today.",
};

export function cellToSimple(status: CellStatus): SimpleStatus {
  switch (status) {
    case "AVAILABLE":
      return "available";
    case "OPTION_1":
    case "OPTION_2":
    case "OPTION_3":
      return "on_hold";
    case "CONFIRMED":
      return "confirmed";
    case "ON_JOB":
      return "on_set";
    case "TRAVELING":
    case "UNAVAILABLE":
      return "away";
    default:
      return "available";
  }
}

export function holdDetailLabel(status: CellStatus): string | null {
  switch (status) {
    case "OPTION_1":
      return "1st hold";
    case "OPTION_2":
      return "2nd hold";
    case "OPTION_3":
      return "3rd hold";
    default:
      return null;
  }
}

export const SIMPLE_STATUS_CLASS: Record<SimpleStatus, string> = {
  available: "",
  on_hold: "bg-amber-950/50 border-l-2 border-l-amber-500",
  confirmed: "bg-emerald-950/60 border-l-2 border-l-emerald-500 text-white",
  away: "bg-paper-muted border-l-2 border-l-paper-border",
  on_set: "bg-rose-950/50 border-l-2 border-l-rose-500 text-white",
};

/** Job assignment status (model bookings list). */
export function assignmentSimpleLabel(status: string): string {
  if (status === "CONFIRMED") return SIMPLE_STATUS_LABEL.confirmed;
  if (status === "OPTION_1" || status === "OPTION_2" || status === "OPTION_3") {
    return SIMPLE_STATUS_LABEL.on_hold;
  }
  if (status === "DECLINED" || status === "RELEASED") return "Released";
  return status.replace(/_/g, " ").toLowerCase();
}

export function assignmentHoldDetail(status: string): string | null {
  switch (status) {
    case "OPTION_1":
      return "1st hold";
    case "OPTION_2":
      return "2nd hold";
    case "OPTION_3":
      return "3rd hold";
    default:
      return null;
  }
}

/** Dropdown label: simple by default, hold priority in parentheses when applicable. */
export function assignmentStatusOptionLabel(status: string, holdDetail = false): string {
  if (status === "PROPOSED") return "Proposed";
  if (status === "CONFIRMED") return "Booked";
  if (status === "DECLINED") return "Declined";
  if (status === "RELEASED") return "Released";
  if (status === "DONE") return "Wrapped";
  if (status === "OPTION_1" || status === "OPTION_2" || status === "OPTION_3") {
    if (holdDetail) return `${assignmentSimpleLabel(status)} (${assignmentHoldDetail(status)})`;
    return assignmentSimpleLabel(status);
  }
  return assignmentSimpleLabel(status);
}

/** Board cell tooltip / aria — avoids raw "1st Option" unless hold detail is on. */
export function boardCellLabel(status: CellStatus, holdDetail: boolean): string {
  if (!holdDetail) {
    const simple = cellToSimple(status);
    const base = SIMPLE_STATUS_LABEL[simple];
    const detail = holdDetailLabel(status);
    return detail && simple === "on_hold" ? `${base} (${detail})` : base;
  }
  const map: Record<CellStatus, string> = {
    AVAILABLE: "Available",
    OPTION_1: "On hold · 1st",
    OPTION_2: "On hold · 2nd",
    OPTION_3: "On hold · 3rd",
    CONFIRMED: "Booked",
    ON_JOB: "On set",
    TRAVELING: "Traveling",
    UNAVAILABLE: "Away",
  };
  return map[status];
}
