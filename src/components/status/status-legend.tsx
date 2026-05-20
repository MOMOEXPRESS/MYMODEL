"use client";

import { SIMPLE_STATUS_HELP, SIMPLE_STATUS_LABEL, type SimpleStatus } from "@/lib/status-language";
import { cn } from "@/lib/utils";

const ORDER: SimpleStatus[] = ["available", "on_hold", "confirmed", "on_set", "away"];

const SWATCH: Record<SimpleStatus, string> = {
  available: "bg-paper-elevated border border-paper-border",
  on_hold: "bg-amber-950/80 border-l-2 border-l-amber-500",
  confirmed: "bg-emerald-950/80 border-l-2 border-l-emerald-500",
  on_set: "bg-rose-950/80 border-l-2 border-l-rose-500",
  away: "bg-paper-muted border border-dashed border-paper-border",
};

export function StatusLegend({ showHelp }: { showHelp?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ORDER.map((s) => (
        <div
          key={s}
          className="flex items-center gap-2 text-xs text-ink-muted"
          title={showHelp ? SIMPLE_STATUS_HELP[s] : undefined}
        >
          <span className={cn("h-4 w-6 rounded-md shrink-0", SWATCH[s])} />
          {SIMPLE_STATUS_LABEL[s]}
        </div>
      ))}
    </div>
  );
}
