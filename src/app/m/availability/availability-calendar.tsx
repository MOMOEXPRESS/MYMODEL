"use client";

// Model-side availability calendar.
//
// Bigger than the sticky pane on /m/card: full-width grid of `weeks` weeks
// starting at the Monday of today's week. Days rendered as square cards —
// click to cycle AVAILABLE → OFF → TRAVELING. Days already held by a
// confirmed / option job show the job pill and are read-only from this page
// (the model accepts / declines those on /m/jobs/[id]).

import { useMemo, useState, useTransition } from "react";
import { setAvailability } from "@/app/agency/models/[modelId]/actions";
import { cn } from "@/lib/utils";

type Status = "AVAILABLE" | "UNAVAILABLE" | "TRAVELING";
type LocalAvailability = { iso: string; status: Status; reason: string | null };
type Hold = {
  iso: string;
  jobId: string;
  jobTitle: string;
  priority: "P1" | "P2" | "P3" | "CONFIRMED";
};

export function AvailabilityCalendar({
  modelId,
  weeks,
  initialAvailability,
  holds,
}: {
  modelId: string;
  weeks: number;
  initialAvailability: LocalAvailability[];
  holds: Hold[];
}) {
  const [local, setLocal] = useState<Record<string, Status>>(() => {
    const out: Record<string, Status> = {};
    for (const a of initialAvailability) out[a.iso] = a.status;
    return out;
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const holdsByDate = useMemo(() => {
    const m = new Map<string, Hold>();
    for (const h of holds) m.set(h.iso, h);
    return m;
  }, [holds]);

  const grid = useMemo(() => buildWeeks(weeks), [weeks]);

  function cycle(iso: string) {
    if (holdsByDate.has(iso)) return; // read-only if held by a job
    const current = local[iso] ?? "AVAILABLE";
    const next: Status =
      current === "AVAILABLE"
        ? "UNAVAILABLE"
        : current === "UNAVAILABLE"
          ? "TRAVELING"
          : "AVAILABLE";
    setLocal((s) => ({ ...s, [iso]: next }));
    setError(null);
    startTransition(async () => {
      const res = await setAvailability({ modelId, date: iso, status: next });
      if (!res.ok) {
        setError(res.error);
        setLocal((s) => ({ ...s, [iso]: current }));
      }
    });
  }

  const monthCursor = (() => {
    // Detect month changes within the grid for subheaders.
    let last: string | null = null;
    return (iso: string) => {
      const m = iso.slice(0, 7);
      if (m === last) return null;
      last = m;
      return monthLabel(iso);
    };
  })();

  return (
    <>
      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-7 gap-2">
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-[0.2em] text-ink-subtle text-center py-1"
          >
            {d}
          </div>
        ))}
        {grid.flat().map((iso) => {
          const hold = holdsByDate.get(iso);
          const status = local[iso] ?? "AVAILABLE";
          const monthBand = monthCursor(iso);
          return (
            <div key={iso}>
              {monthBand && (
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-2 mb-1">
                  {monthBand}
                </div>
              )}
              <button
                type="button"
                onClick={() => cycle(iso)}
                disabled={pending || Boolean(hold)}
                title={
                  hold
                    ? `${hold.priority === "CONFIRMED" ? "Booked on" : "Option on"} ${hold.jobTitle}`
                    : `${labelFor(status)} · ${iso}`
                }
                className={cn(
                  "relative w-full aspect-square rounded-lg text-xs border transition-all overflow-hidden",
                  !hold && "cursor-pointer hover:-translate-y-0.5",
                  tileClass(status, hold),
                  isToday(iso) && "ring-1 ring-accent/60",
                )}
              >
                <div className="absolute top-1.5 left-2 font-medium">
                  {Number(iso.slice(-2))}
                </div>
                {hold ? (
                  <div className="absolute inset-x-1 bottom-1 text-[9px] text-white/90 leading-tight">
                    <div className="truncate">{hold.jobTitle}</div>
                    <div className="opacity-70">
                      {hold.priority === "CONFIRMED"
                        ? "Booked"
                        : hold.priority === "P1"
                          ? "1st option"
                          : hold.priority === "P2"
                            ? "2nd option"
                            : "3rd option"}
                    </div>
                  </div>
                ) : status !== "AVAILABLE" ? (
                  <div className="absolute inset-x-1 bottom-1 text-[10px] leading-tight">
                    {labelFor(status)}
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
        <Legend swatch="bg-paper-elevated border border-paper-border" label="Free" />
        <Legend swatch="bg-[#1F1F1F]" label="Off" />
        <Legend swatch="bg-[#131E36]" label="Traveling" />
        <Legend swatch="bg-[#17331F] border-l-2 border-l-board-confirmed" label="Booked (read-only)" />
      </div>
    </>
  );
}

function tileClass(status: Status, hold: Hold | undefined): string {
  if (hold) {
    if (hold.priority === "CONFIRMED") {
      return "bg-[#17331F] border-transparent border-l-2 border-l-board-confirmed text-white";
    }
    const rail =
      hold.priority === "P1"
        ? "border-l-[#D4812B]"
        : hold.priority === "P2"
          ? "border-l-[#B07A22]"
          : "border-l-[#8A6A2A]";
    return `bg-[#3A2410]/70 border-transparent border-l-2 ${rail} text-white`;
  }
  if (status === "UNAVAILABLE") return "bg-[#1F1F1F] border-paper-border text-ink-muted";
  if (status === "TRAVELING") return "bg-[#131E36] border-transparent text-white";
  return "bg-paper-elevated border-paper-border text-ink";
}

function labelFor(s: Status): string {
  if (s === "UNAVAILABLE") return "Off";
  if (s === "TRAVELING") return "Traveling";
  return "Free";
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

function monthLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00.000Z");
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function isToday(iso: string): boolean {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return iso === today.toISOString().slice(0, 10);
}

function buildWeeks(count: number): string[][] {
  const now = new Date();
  const today0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today0.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const startMonday = new Date(today0);
  startMonday.setUTCDate(startMonday.getUTCDate() + mondayOffset);

  const weeks: string[][] = [];
  for (let w = 0; w < count; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(startMonday);
      dt.setUTCDate(startMonday.getUTCDate() + w * 7 + d);
      row.push(dt.toISOString().slice(0, 10));
    }
    weeks.push(row);
  }
  return weeks;
}
