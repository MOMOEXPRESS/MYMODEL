"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MODELS = ["Ava", "Noah", "Léa", "Kai", "Mia"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type CellState = "idle" | "hold" | "confirmed";

function randomCell() {
  const r = Math.random();
  if (r < 0.55) return "idle";
  if (r < 0.82) return "hold";
  return "confirmed";
}

export function LiveBoard() {
  const [grid, setGrid] = useState<CellState[][]>(() =>
    MODELS.map(() => DAYS.map(() => randomCell())),
  );
  const [pulse, setPulse] = useState<{ r: number; c: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.floor(Math.random() * MODELS.length);
      const c = Math.floor(Math.random() * DAYS.length);
      const next = randomCell();
      setGrid((g) => {
        const copy = g.map((row) => [...row]);
        copy[r][c] = next;
        return copy;
      });
      setPulse({ r, c });
      const t = setTimeout(() => setPulse(null), 1200);
      return () => clearTimeout(t);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mk-fade-up mk-fade-up-d4 relative border border-[var(--mk-line)] bg-[rgba(255,255,255,0.02)] p-5 sm:p-6 w-full max-w-lg mx-auto lg:mx-0 lg:ml-auto">
      <div className="flex items-center justify-between mb-4 px-0.5">
        <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--mk-subtle)]">Live schedule</span>
        <span className="flex items-center gap-2 text-[10px] text-[var(--mk-emerald)] tracking-wide">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--mk-emerald)] animate-pulse" />
          syncing
        </span>
      </div>
      <div className="grid grid-cols-[72px_repeat(7,1fr)] gap-1 text-[10px]">
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[var(--mk-muted)] py-1 font-medium tracking-wide">
            {d}
          </div>
        ))}
        {MODELS.map((name, ri) => (
          <div key={name} className="contents">
            <div className="flex items-center text-[var(--mk-ink)]/85 font-medium pr-2 truncate text-[11px]">
              {name}
            </div>
            {DAYS.map((_, ci) => {
              const state = grid[ri][ci];
              const isPulse = pulse?.r === ri && pulse?.c === ci;
              return (
                <div
                  key={`${ri}-${ci}`}
                  className={cn(
                    "mk-board-cell h-7",
                    state === "hold" && "mk-board-cell--hold",
                    state === "confirmed" && "mk-board-cell--confirmed",
                    state === "idle" && "bg-white/[0.02]",
                    isPulse && "mk-board-cell--pulse",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--mk-line)] flex flex-wrap gap-4 text-[10px] text-[var(--mk-muted)] tracking-wide">
        <Legend dot="bg-white/[0.06]" label="Open" />
        <Legend dot="bg-[var(--mk-amber)]/50" label="On hold" />
        <Legend dot="bg-[var(--mk-emerald)]/50" label="Confirmed" />
      </div>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-sm", dot)} />
      {label}
    </span>
  );
}
