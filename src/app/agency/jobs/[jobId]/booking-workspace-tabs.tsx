"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "lineup", label: "Lineup" },
  { id: "details", label: "Details" },
  { id: "production", label: "Production" },
  { id: "client", label: "Client" },
] as const;

export type BookingTab = (typeof TABS)[number]["id"];

export function BookingWorkspaceTabs({
  children,
}: {
  children: Record<BookingTab, React.ReactNode>;
}) {
  const [tab, setTab] = useState<BookingTab>("lineup");

  return (
    <div>
      <div className="flex gap-1 border-b border-paper-border overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-accent text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="py-8">{children[tab]}</div>
    </div>
  );
}
