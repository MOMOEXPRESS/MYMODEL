"use client";

// The Board.
//
// A sticky-header, sticky-left-column grid. One row per model, one column
// per date. Cells show the model's effective status for that day, derived
// from Holds (Jobs — Sprint 3+) and Availability (this sprint).
//
// Interactions
//  - Click a cell  → select just that cell
//  - Shift-click a second cell → range-select across columns (and rows)
//  - Drag across cells → range-select
//  - With a selection, the popover at the bottom lets you set
//    AVAILABLE / UNAVAILABLE / TRAVELING across the selection, hitting
//    PATCH /api/board/cell with a cross-product modelIds × dates payload.
//
// Status → color map comes from brief §9.

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { BoardPayload, CellStatus } from "@/lib/board";
import {
  addDays,
  deriveCellStatus,
  dowShort,
  iso,
  isToday,
  isWeekend,
  monthLabel,
  utcDate,
} from "@/lib/board";
import { cn, initials } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────

const DIVISIONS = [
  { value: "", label: "All divisions" },
  { value: "WOMEN", label: "Women" },
  { value: "MEN", label: "Men" },
  { value: "CURVE", label: "Curve" },
  { value: "KIDS", label: "Kids" },
  { value: "TALENTS", label: "Talents" },
  { value: "NEW_FACES", label: "New faces" },
] as const;

const DAYS_OPTIONS = [14, 30, 60] as const;

// Tailwind classes for each status cell (card-like mini-tiles instead of
// solid paint blocks). Left edge carries a colored rail so you can scan
// the Board at a glance; the card body stays on the elevated-paper tone.
const STATUS_CLASS: Record<CellStatus, string> = {
  AVAILABLE: "",
  OPTION_3: "bg-[#3F321A]/60 border-l-2 border-l-[#8A6A2A]",
  OPTION_2: "bg-[#4A3815]/70 border-l-2 border-l-[#B07A22]",
  OPTION_1: "bg-[#3A2410]/80 border-l-2 border-l-[#D4812B] text-white",
  CONFIRMED: "bg-[#17331F] border-l-2 border-l-board-confirmed text-white",
  ON_JOB: "bg-[#3A1511] border-l-2 border-l-board-onJob text-white",
  TRAVELING: "bg-[#131E36] border-l-2 border-l-board-traveling text-white",
  UNAVAILABLE:
    "bg-[repeating-linear-gradient(135deg,#1F1F1F_0,#1F1F1F_4px,#0A0A0A_4px,#0A0A0A_8px)]",
};

// Human labels aligned with industry vernacular.  "1st Option" means first
// dibs on the dates; 2nd is the backup; 3rd is a deeper backup.
const STATUS_LABEL: Record<CellStatus, string> = {
  AVAILABLE: "Free",
  OPTION_3: "3rd Option",
  OPTION_2: "2nd Option",
  OPTION_1: "1st Option",
  CONFIRMED: "Booked",
  ON_JOB: "On set",
  TRAVELING: "Traveling",
  UNAVAILABLE: "Off",
};

const STATUS_HELP: Record<CellStatus, string> = {
  AVAILABLE: "No hold — open for bookings.",
  OPTION_3: "Third dibs — booker behind two others.",
  OPTION_2: "Second option — backup to a 1st Option.",
  OPTION_1: "First dibs on these dates.",
  CONFIRMED: "Booked. Dates locked for this job.",
  ON_JOB: "On set today — shoot in progress.",
  TRAVELING: "Traveling for a job — not reachable for others.",
  UNAVAILABLE: "Blocked out — personal, holiday, off the market.",
};

// ──────────────────────────────────────────────────────────────────────

export function BoardClient({
  initial,
  initialDays,
  initialFrom,
  initialDivision,
  initialQuery,
}: {
  initial: BoardPayload;
  initialDays: number;
  initialFrom: string;
  initialDivision: string;
  initialQuery: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [data, setData] = useState(initial);
  const [days, setDays] = useState(initialDays);
  const [fromIso, setFromIso] = useState(initialFrom);
  const [division, setDivision] = useState(initialDivision);
  const [query, setQuery] = useState(initialQuery);
  const [isPendingRefetch, setPendingRefetch] = useState(false);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => writeUrl({ q: query || undefined }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Refetch when any filter changes
  useEffect(() => {
    const ac = new AbortController();
    setPendingRefetch(true);
    const qs = new URLSearchParams({
      from: fromIso,
      to: iso(addDays(utcDate(fromIso), days - 1)),
    });
    if (division) qs.set("division", division);
    if (query) qs.set("q", query);
    fetch(`/api/board?${qs.toString()}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: BoardPayload | null) => {
        if (json) setData(json);
        setPendingRefetch(false);
      })
      .catch(() => setPendingRefetch(false));
    return () => ac.abort();
  }, [fromIso, days, division, query]);

  function writeUrl(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    // Always reflect current state for reload-safety
    if (days !== 30) next.set("days", String(days)); else next.delete("days");
    if (division) next.set("division", division); else next.delete("division");
    if (fromIso !== iso(new Date(new Date().setUTCHours(0, 0, 0, 0)))) next.set("from", fromIso);
    else next.delete("from");
    startTransition(() => router.replace(`?${next.toString()}`));
  }

  function shift(direction: -1 | 1) {
    const next = iso(addDays(utcDate(fromIso), direction * Math.ceil(days / 2)));
    setFromIso(next);
    writeUrl({ from: next });
  }

  function setDaysChoice(n: number) {
    setDays(n);
    // keep from as-is; update url
    const next = new URLSearchParams(sp.toString());
    if (n !== 30) next.set("days", String(n)); else next.delete("days");
    startTransition(() => router.replace(`?${next.toString()}`));
  }

  function setDivisionChoice(v: string) {
    setDivision(v);
    const next = new URLSearchParams(sp.toString());
    if (v) next.set("division", v); else next.delete("division");
    startTransition(() => router.replace(`?${next.toString()}`));
  }

  return (
    <div>
      <Toolbar
        days={days}
        onDays={setDaysChoice}
        division={division}
        onDivision={setDivisionChoice}
        query={query}
        onQuery={setQuery}
        fromIso={fromIso}
        onShift={shift}
        onToday={() => {
          const t = iso(new Date(new Date().setUTCHours(0, 0, 0, 0)));
          setFromIso(t);
          writeUrl({ from: undefined });
        }}
        loading={isPendingRefetch}
      />
      <BoardGrid
        key={`${fromIso}:${days}`}
        data={data}
        onOptimistic={setData}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

function Toolbar({
  days,
  onDays,
  division,
  onDivision,
  query,
  onQuery,
  fromIso,
  onShift,
  onToday,
  loading,
}: {
  days: number;
  onDays: (n: number) => void;
  division: string;
  onDivision: (v: string) => void;
  query: string;
  onQuery: (v: string) => void;
  fromIso: string;
  onShift: (dir: -1 | 1) => void;
  onToday: () => void;
  loading: boolean;
}) {
  const rangeLabel = useMemo(() => {
    const from = utcDate(fromIso);
    const to = addDays(from, days - 1);
    const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear();
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    if (sameMonth) {
      return `${fmt(from)} – ${to.getUTCDate()}, ${from.getUTCFullYear()}`;
    }
    return `${fmt(from)} – ${fmt(to)}, ${to.getUTCFullYear()}`;
  }, [fromIso, days]);

  return (
    <div className="px-8 pt-8 pb-4 border-b border-paper-border bg-paper-elevated sticky top-0 z-20">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Board</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {rangeLabel}{loading ? " · loading…" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => onShift(-1)} className="ll-btn-secondary p-2" aria-label="Previous">
              <ChevronLeft size={14} />
            </button>
            <button onClick={onToday} className="ll-btn-secondary text-xs px-3">Today</button>
            <button onClick={() => onShift(1)} className="ll-btn-secondary p-2" aria-label="Next">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex rounded-lg border border-paper-border overflow-hidden">
            {DAYS_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onDays(n)}
                className={
                  days === n
                    ? "px-3 py-1.5 text-xs bg-ink text-paper"
                    : "px-3 py-1.5 text-xs bg-paper-elevated hover:bg-paper"
                }
              >
                {n}d
              </button>
            ))}
          </div>

          <select
            value={division}
            onChange={(e) => onDivision(e.target.value)}
            className="ll-input w-auto text-xs"
          >
            {DIVISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Find a model"
              className="ll-input pl-9 w-56"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────

type SelectionRect = {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
};

function BoardGrid({
  data,
  onOptimistic,
}: {
  data: BoardPayload;
  onOptimistic: (next: BoardPayload) => void;
}) {
  const { dates, rows } = data;

  // Ephemeral selection (drag) → committed selection on mouse-up.
  const [dragStart, setDragStart] = useState<{ r: number; c: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ r: number; c: number } | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);

  const gridRef = useRef<HTMLDivElement | null>(null);

  // End drag globally on mouse-up (handles pointer leaving the grid).
  useEffect(() => {
    function onUp() {
      if (dragStart && dragEnd) {
        setSelection({
          rowStart: Math.min(dragStart.r, dragEnd.r),
          rowEnd: Math.max(dragStart.r, dragEnd.r),
          colStart: Math.min(dragStart.c, dragEnd.c),
          colEnd: Math.max(dragStart.c, dragEnd.c),
        });
      }
      setDragStart(null);
      setDragEnd(null);
    }
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, [dragStart, dragEnd]);

  const visibleRect: SelectionRect | null = useMemo(() => {
    if (dragStart && dragEnd) {
      return {
        rowStart: Math.min(dragStart.r, dragEnd.r),
        rowEnd: Math.max(dragStart.r, dragEnd.r),
        colStart: Math.min(dragStart.c, dragEnd.c),
        colEnd: Math.max(dragStart.c, dragEnd.c),
      };
    }
    return selection;
  }, [dragStart, dragEnd, selection]);

  async function applyStatus(status: "AVAILABLE" | "UNAVAILABLE" | "TRAVELING") {
    if (!selection) return;

    const modelIds = rows
      .slice(selection.rowStart, selection.rowEnd + 1)
      .map((r) => r.modelId);
    const dateSlice = dates.slice(selection.colStart, selection.colEnd + 1);

    // Optimistic patch.
    const next: BoardPayload = {
      ...data,
      rows: data.rows.map((r, i) => {
        if (i < selection.rowStart || i > selection.rowEnd) return r;
        const availability = { ...r.availability };
        for (const d of dateSlice) {
          if (status === "AVAILABLE") delete availability[d];
          else availability[d] = status;
        }
        return { ...r, availability };
      }),
    };
    onOptimistic(next);
    setSelection(null);

    const res = await fetch("/api/board/cell", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ modelIds, dates: dateSlice, status }),
    });
    if (!res.ok) {
      // Rollback — simplest: refetch isn't wired here so revert by toggling.
      onOptimistic(data);
    }
  }

  function clearSelection() {
    setSelection(null);
  }

  if (rows.length === 0) {
    return (
      <div className="px-8 py-16 text-center text-ink-muted">
        No models match the current filters.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={gridRef}
        className="relative overflow-auto select-none border-b border-paper-border"
        style={{ maxHeight: "calc(100vh - 170px)" }}
        onMouseLeave={() => setDragEnd(null)}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `220px repeat(${dates.length}, 40px)`,
          }}
        >
          {/* ── Header rows ─────────────────────────────────────────── */}
          {/* Row 1: month labels spanning as needed */}
          <MonthHeader dates={dates} />

          {/* Row 2: DOW + day number */}
          <div className="sticky top-[28px] left-0 bg-paper-elevated z-20 border-b border-r border-paper-border h-12" />
          {dates.map((d, i) => {
            const today = isToday(d);
            const weekend = isWeekend(d);
            return (
              <div
                key={d}
                className={cn(
                  "sticky top-[28px] z-10 h-12 flex flex-col items-center justify-center text-[10px] border-b border-paper-border",
                  weekend ? "bg-paper" : "bg-paper-elevated",
                  today && "bg-accent-soft",
                  i % 7 === 6 && "border-r border-paper-border",
                )}
              >
                <div className="text-ink-subtle uppercase tracking-wider">{dowShort(d)}</div>
                <div className={cn("font-medium text-sm", today && "text-accent")}>
                  {parseInt(d.slice(-2), 10)}
                </div>
              </div>
            );
          })}

          {/* ── Body rows ───────────────────────────────────────────── */}
          {rows.map((row, ri) => (
            <Row
              key={row.modelId}
              row={row}
              rowIndex={ri}
              dates={dates}
              dragStart={dragStart}
              selection={visibleRect}
              onDragStart={(c) => {
                setDragStart({ r: ri, c });
                setDragEnd({ r: ri, c });
              }}
              onDragEnter={(c) => {
                if (dragStart) setDragEnd({ r: ri, c });
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-8 py-3 flex items-center gap-4 text-xs text-ink-muted flex-wrap">
        <Legend status="AVAILABLE" />
        <Legend status="OPTION_3" />
        <Legend status="OPTION_2" />
        <Legend status="OPTION_1" />
        <Legend status="CONFIRMED" />
        <Legend status="ON_JOB" />
        <Legend status="TRAVELING" />
        <Legend status="UNAVAILABLE" />
      </div>

      {/* Selection action bar */}
      {selection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 ll-card shadow-xl flex items-center gap-2 p-2">
          <span className="text-xs text-ink-muted px-2">
            {(selection.rowEnd - selection.rowStart + 1) *
              (selection.colEnd - selection.colStart + 1)}{" "}
            cell(s) selected
          </span>
          <button onClick={() => applyStatus("AVAILABLE")} className="ll-btn-secondary text-xs">
            Available
          </button>
          <button onClick={() => applyStatus("UNAVAILABLE")} className="ll-btn-secondary text-xs">
            Unavailable
          </button>
          <button onClick={() => applyStatus("TRAVELING")} className="ll-btn-secondary text-xs">
            Traveling
          </button>
          <button onClick={clearSelection} className="ll-btn-ghost text-xs" aria-label="Clear selection">
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  row,
  rowIndex,
  dates,
  selection,
  dragStart,
  onDragStart,
  onDragEnter,
}: {
  row: BoardPayload["rows"][number];
  rowIndex: number;
  dates: string[];
  selection: SelectionRect | null;
  dragStart: { r: number; c: number } | null;
  onDragStart: (c: number) => void;
  onDragEnter: (c: number) => void;
}) {
  return (
    <>
      {/* sticky name cell */}
      <div className="sticky left-0 bg-paper-elevated z-10 border-b border-r border-paper-border px-3 h-10 flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center shrink-0">
          {initials(row.name)}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate leading-tight">{row.name}</div>
          <div className="text-[10px] text-ink-subtle uppercase tracking-wider">
            {row.division.replace("_", " ")}
          </div>
        </div>
      </div>

      {dates.map((d, ci) => {
        const holds = row.holds[d];
        const avail = row.availability[d];
        const status = deriveCellStatus(holds, avail);
        const selected =
          selection &&
          rowIndex >= selection.rowStart &&
          rowIndex <= selection.rowEnd &&
          ci >= selection.colStart &&
          ci <= selection.colEnd;
        const weekend = isWeekend(d);
        const today = isToday(d);
        const weekEnd = ci % 7 === 6;

        const primary = holds?.[0];
        const callTime = primary?.callTime ?? null;
        const jobPill = primary?.jobTitle
          ? primary.jobTitle.length > 14
            ? primary.jobTitle.slice(0, 12) + "…"
            : primary.jobTitle
          : null;

        return (
          <div
            key={d}
            data-row={rowIndex}
            data-col={ci}
            onMouseDown={(e) => {
              e.preventDefault();
              onDragStart(ci);
            }}
            onMouseEnter={() => {
              if (dragStart) onDragEnter(ci);
            }}
            title={
              holds && holds.length > 0
                ? `${STATUS_LABEL[status]} · ${holds
                    .map((h) => h.jobTitle + (h.callTime ? ` · call ${h.callTime}` : ""))
                    .join(", ")}`
                : `${STATUS_LABEL[status]} · ${d}`
            }
            className={cn(
              "relative h-12 border-b border-paper-border cursor-crosshair transition-colors",
              status === "AVAILABLE" ? "" : "rounded-sm m-0.5 overflow-hidden",
              STATUS_CLASS[status],
              weekend && status === "AVAILABLE" && "bg-white/[0.02]",
              weekEnd && "border-r border-paper-border",
              today && "ring-1 ring-inset ring-accent/50",
              selected && "outline outline-2 -outline-offset-1 outline-ink z-[2]",
            )}
          >
            {status !== "AVAILABLE" && (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-[9px] leading-tight px-1 text-center">
                {callTime && (
                  <span className="font-mono text-[9px] opacity-90">{callTime}</span>
                )}
                {jobPill && (
                  <span className="truncate w-full opacity-90">{jobPill}</span>
                )}
              </div>
            )}
            {holds && holds.length > 1 && (
              <span className="absolute top-0.5 right-1 text-[8px] opacity-70 font-medium">
                +{holds.length - 1}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function MonthHeader({ dates }: { dates: string[] }) {
  // Walk the dates; emit a month cell per month with colspan = days in that month within window.
  const segments = useMemo(() => {
    const out: { month: string; span: number; startCol: number }[] = [];
    let i = 0;
    while (i < dates.length) {
      const m = monthLabel(dates[i]!);
      let j = i;
      while (j < dates.length && monthLabel(dates[j]!) === m) j++;
      out.push({ month: m, span: j - i, startCol: i });
      i = j;
    }
    return out;
  }, [dates]);

  return (
    <>
      <div className="sticky top-0 left-0 bg-paper-elevated z-30 border-b border-r border-paper-border h-7 flex items-center px-3 text-[10px] uppercase tracking-wider text-ink-subtle">
        Model
      </div>
      {segments.map((s) => (
        <div
          key={`${s.month}-${s.startCol}`}
          className="sticky top-0 z-20 h-7 bg-paper-elevated border-b border-paper-border flex items-center justify-center text-[10px] uppercase tracking-wider text-ink-subtle font-medium"
          style={{ gridColumn: `span ${s.span}` }}
        >
          {s.month} {utcDate(dates[s.startCol]!).getUTCFullYear()}
        </div>
      ))}
    </>
  );
}

function Legend({ status }: { status: CellStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("w-3 h-3 rounded-sm border border-paper-border", STATUS_CLASS[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
