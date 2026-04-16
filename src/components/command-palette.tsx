"use client";

// Cmd+K (or Ctrl+K) global search palette.
//
// Hotkey: Cmd+K / Ctrl+K opens; Esc closes; ↑/↓ + Enter to navigate.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Users, Briefcase, Receipt, FilePenLine, Sparkles } from "lucide-react";
import type { SearchHit } from "@/app/api/search/route";
import { cn, initials } from "@/lib/utils";

const ICONS: Record<SearchHit["type"], React.ComponentType<{ size?: number | string }>> = {
  model: Users,
  job: Briefcase,
  invoice: Receipt,
  contract: FilePenLine,
  prospect: Sparkles,
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Hotkey
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input on open + reset
  useEffect(() => {
    if (open) {
      setQ("");
      setHits([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    const t = setTimeout(async () => {
      if (q.trim().length < 1) {
        setHits([]);
        return;
      }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (!r.ok) return;
        const json = (await r.json()) as { hits: SearchHit[] };
        setHits(json.hits);
        setActive(0);
      } catch {
        /* abort */
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q, open]);

  const go = useCallback(
    (hit: SearchHit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4" onClick={() => setOpen(false)}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="ll-card shadow-2xl w-full max-w-xl overflow-hidden animate-card-in"
      >
        <div className="px-4 py-3 border-b border-paper-border flex items-center gap-2">
          <Search size={16} className="text-ink-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search models, jobs, invoices…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-subtle"
          />
          <kbd className="text-[10px] text-ink-subtle border border-paper-border rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {q.length === 0 ? (
            <p className="text-xs text-ink-subtle text-center py-12">
              Type to search. Use ↑↓ + Enter.
            </p>
          ) : hits.length === 0 ? (
            <p className="text-xs text-ink-subtle text-center py-12">No matches.</p>
          ) : (
            <ul>
              {hits.map((hit, i) => {
                const Icon = ICONS[hit.type];
                return (
                  <li key={`${hit.type}-${hit.id}`}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(hit)}
                      className={cn(
                        "w-full px-4 py-2.5 flex items-center gap-3 text-left",
                        active === i ? "bg-paper" : "hover:bg-paper/60",
                      )}
                    >
                      {hit.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={hit.imageUrl}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-paper-border/60 flex items-center justify-center text-ink-muted shrink-0">
                          <Icon size={13} />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{hit.title}</div>
                        {hit.subtitle && (
                          <div className="text-[11px] text-ink-subtle truncate">
                            {hit.subtitle}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-ink-subtle">
                        {hit.type}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-4 py-2 border-t border-paper-border text-[10px] text-ink-subtle flex items-center justify-between">
          <span>↑↓ navigate · ↵ open · esc close</span>
          <span className="font-mono">{initials("Cmd+K")}</span>
        </div>
      </div>
    </div>
  );
}
