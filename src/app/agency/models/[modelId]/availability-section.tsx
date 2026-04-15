"use client";

import { Availability } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { setAvailability } from "./actions";
import { cn } from "@/lib/utils";

// Months from today, show 8 weeks at a time.
const WEEKS_PER_VIEW = 8;

export function AvailabilitySection({
  modelId,
  availability,
}: {
  modelId: string;
  availability: Availability[];
}) {
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState<Record<string, "AVAILABLE" | "UNAVAILABLE" | "TRAVELING">>(() => {
    const out: Record<string, "AVAILABLE" | "UNAVAILABLE" | "TRAVELING"> = {};
    for (const a of availability) {
      out[iso(a.date)] = a.status;
    }
    return out;
  });

  const weeks = useMemo(() => buildWeeks(offsetWeeks, WEEKS_PER_VIEW), [offsetWeeks]);

  function cycleStatus(dateStr: string) {
    const current = local[dateStr] ?? "AVAILABLE";
    const next =
      current === "AVAILABLE" ? "UNAVAILABLE"
      : current === "UNAVAILABLE" ? "TRAVELING"
      : "AVAILABLE";

    setLocal((s) => ({ ...s, [dateStr]: next }));
    startTransition(async () => {
      const res = await setAvailability({ modelId, date: dateStr, status: next });
      if (!res.ok) {
        // revert on failure
        setLocal((s) => ({ ...s, [dateStr]: current }));
      }
    });
  }

  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Availability</h2>
          <p className="text-xs text-ink-subtle mt-0.5">
            Click a day to toggle: available → unavailable → traveling.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffsetWeeks((o) => Math.max(0, o - WEEKS_PER_VIEW))}
            disabled={offsetWeeks === 0}
            className="ll-btn-ghost p-1.5"
            aria-label="Previous"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setOffsetWeeks((o) => o + WEEKS_PER_VIEW)}
            className="ll-btn-ghost p-1.5"
            aria-label="Next"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {"MTWTFSS".split("").map((d, i) => (
          <div key={i} className="text-center text-[10px] uppercase tracking-wider text-ink-subtle py-1">
            {d}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const key = iso(day);
          const status = local[key] ?? "AVAILABLE";
          const isFirstOfMonth = day.getUTCDate() === 1;
          return (
            <button
              key={key}
              type="button"
              onClick={() => cycleStatus(key)}
              disabled={pending}
              className={cn(
                "relative h-10 rounded-md text-xs border transition-colors",
                status === "AVAILABLE" && "bg-white border-paper-border hover:border-ink-subtle text-ink",
                status === "UNAVAILABLE" && "bg-board-unavailable border-transparent text-ink",
                status === "TRAVELING" && "bg-board-traveling border-transparent text-white",
              )}
              title={`${key} · ${status.toLowerCase()}`}
            >
              <span>{day.getUTCDate()}</span>
              {isFirstOfMonth && (
                <span className="absolute top-0.5 left-1 text-[9px] text-ink-subtle">
                  {day.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
        <Legend swatch="bg-white border border-paper-border" label="Available" />
        <Legend swatch="bg-board-unavailable" label="Unavailable" />
        <Legend swatch="bg-board-traveling" label="Traveling" />
      </div>
    </section>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Build N weeks of Mon-first dates starting from the Monday of `offsetWeeks` weeks from today. */
function buildWeeks(offsetWeeks: number, count: number): Date[][] {
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  // Monday of this week
  const day = utcToday.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const startMonday = new Date(utcToday);
  startMonday.setUTCDate(startMonday.getUTCDate() + mondayOffset + offsetWeeks * 7);

  const weeks: Date[][] = [];
  for (let w = 0; w < count; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startMonday);
      date.setUTCDate(startMonday.getUTCDate() + w * 7 + d);
      row.push(date);
    }
    weeks.push(row);
  }
  return weeks;
}
