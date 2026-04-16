"use client";

import Link from "next/link";
import { JobStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const TABS: { value?: JobStatus; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
  { value: "DRAFT", label: "Draft" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function JobStatusFilter({
  current,
  countMap,
}: {
  current?: JobStatus;
  countMap: Record<string, number>;
}) {
  return (
    <div className="flex gap-1.5 text-xs flex-wrap">
      {TABS.map((t) => {
        const isActive = (current ?? undefined) === t.value;
        const count = t.value ? countMap[t.value] ?? 0 : Object.values(countMap).reduce((s, n) => s + n, 0);
        return (
          <Link
            key={t.label}
            href={t.value ? `?status=${t.value}` : "?"}
            className={cn(
              "px-3 py-1.5 rounded-lg border transition-colors",
              isActive
                ? "bg-ink text-paper border-ink"
                : "border-paper-border hover:bg-paper",
            )}
          >
            {t.label}
            <span className={cn("ml-2", isActive ? "opacity-70" : "text-ink-subtle")}>
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
