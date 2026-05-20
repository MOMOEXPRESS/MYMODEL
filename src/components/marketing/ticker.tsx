"use client";

const ITEMS = [
  "Paris · SS26 beauty",
  "1st hold → confirmed",
  "Casting blast · 12 replies",
  "Milan week",
  "Client package opened",
  "On set · 06:00 call",
  "2nd hold released",
  "Group event · rooftop",
  "Invoice sent",
  "Network · new connection",
];

export function MarketingTicker() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="mk-section-rule bg-white/[0.015] overflow-hidden py-4">
      <div className="mk-ticker-track gap-12 sm:gap-16 px-6">
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="text-xs sm:text-sm whitespace-nowrap text-[var(--mk-muted)] tracking-[0.06em] font-mono"
          >
            <span className="text-[var(--mk-warm)] mr-4 opacity-60">—</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
