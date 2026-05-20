"use client";

// Global ⌘K palette. Triggered anywhere with ⌘K / Ctrl+K. Shows:
//   - Fast route jumps (roster, board, jobs, etc.)
//   - Remote search via /api/search (models, jobs, invoices, contracts, prospects)
//
// Built on cmdk — the keyboard-first primitive Emil Kowalski uses in Sonner's
// and Vercel's product. Backdrop fades, panel pops with a soft spring.

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Home,
  Users,
  CalendarRange,
  Briefcase,
  MessageSquare,
  Radio,
  Settings,
  Receipt,
  FilePenLine,
  ShieldCheck,
  Sparkles,
  BarChart3,
  History,
  Banknote,
  Trash2,
  FileText,
  Building2,
  CalendarCheck,
  ArrowRight,
  Search,
} from "lucide-react";
import type { SearchHit } from "@/app/api/search/route";

const ROUTES: {
  label: string;
  href: string;
  hint: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { label: "Home", href: "/agency", hint: "dashboard", icon: Home },
  { label: "Roster", href: "/agency/roster", hint: "models", icon: Users },
  { label: "Schedule", href: "/agency/schedule", hint: "calendar", icon: CalendarRange },
  { label: "Jobs", href: "/agency/jobs", hint: "bookings", icon: Briefcase },
  { label: "Messages", href: "/agency/messages", hint: "dms", icon: MessageSquare },
  { label: "Broadcasts", href: "/agency/broadcasts", hint: "send many", icon: Radio },
  { label: "Pitch deck", href: "/agency/pitch", hint: "export pdf", icon: FileText },
  { label: "Packages", href: "/agency/packages", hint: "share links", icon: FileText },
  { label: "Invoices", href: "/agency/invoices", hint: "billing", icon: Receipt },
  { label: "Payouts", href: "/agency/payouts", hint: "model pay", icon: Banknote },
  { label: "Contracts", href: "/agency/contracts", hint: "signing", icon: FilePenLine },
  { label: "Compliance", href: "/agency/compliance", hint: "docs", icon: ShieldCheck },
  { label: "Scouting", href: "/agency/prospects", hint: "new faces", icon: Sparkles },
  { label: "Castings", href: "/agency/castings", hint: "open calls", icon: CalendarCheck },
  { label: "Clients", href: "/agency/clients", hint: "portal", icon: Building2 },
  { label: "Analytics", href: "/agency/analytics", hint: "stats", icon: BarChart3 },
  { label: "Activity", href: "/agency/activity", hint: "audit log", icon: History },
  { label: "Trash", href: "/agency/trash", hint: "soft-deleted", icon: Trash2 },
  { label: "Settings", href: "/agency/settings", hint: "agency", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Keyboard shortcut — ⌘K on mac, Ctrl+K elsewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((s) => !s);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset query on close.
  useEffect(() => {
    if (!open) {
      setQ("");
      setHits([]);
    }
  }, [open]);

  // Remote search, debounced.
  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (needle.length < 2) {
      setHits([]);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(needle)}`, {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const json = (await res.json()) as { hits: SearchHit[] };
        setHits(json.hits ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setHits([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q, open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const grouped = useMemo(() => {
    const groups: Record<string, SearchHit[]> = {};
    for (const h of hits) {
      const label =
        h.type === "model"
          ? "Models"
          : h.type === "job"
            ? "Jobs"
            : h.type === "invoice"
              ? "Invoices"
              : h.type === "contract"
                ? "Contracts"
                : "Prospects";
      (groups[label] ??= []).push(h);
    }
    return groups;
  }, [hits]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-page-in"
        aria-hidden
      />
      <Command
        loop
        shouldFilter={false}
        label="Global command menu"
        className="relative w-full max-w-xl ll-card shadow-2xl overflow-hidden animate-card-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-paper-border">
          <Search size={14} className="text-ink-subtle" />
          <Command.Input
            value={q}
            onValueChange={setQ}
            autoFocus
            placeholder="Jump to a page, search the roster…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-subtle"
          />
          <span className="kbd">esc</span>
        </div>

        <Command.List className="max-h-[52vh] overflow-y-auto p-1">
          {q.trim().length >= 2 && (
            <>
              {loading && (
                <div className="px-4 py-6 text-center text-xs text-ink-subtle">
                  Searching…
                </div>
              )}
              {!loading && hits.length === 0 && (
                <Command.Empty className="px-4 py-6 text-center text-sm text-ink-subtle">
                  Nothing matches &ldquo;{q}&rdquo;.
                </Command.Empty>
              )}
              {Object.entries(grouped).map(([label, items]) => (
                <Command.Group
                  key={label}
                  heading={label}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
                >
                  {items.map((h) => (
                    <Command.Item
                      key={`${h.type}-${h.id}`}
                      value={`${h.title} ${h.subtitle ?? ""}`}
                      onSelect={() => go(h.href)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-white/5"
                    >
                      {h.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={h.imageUrl}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-accent-soft text-accent text-[9px] font-medium flex items-center justify-center">
                          {h.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{h.title}</div>
                        {h.subtitle && (
                          <div className="text-[10px] text-ink-subtle truncate">
                            {h.subtitle}
                          </div>
                        )}
                      </div>
                      <ArrowRight size={12} className="text-ink-subtle" />
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </>
          )}

          <Command.Group
            heading="Go to"
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-subtle"
          >
            {ROUTES.filter((r) => {
              if (q.trim().length === 0) return true;
              const needle = q.trim().toLowerCase();
              return (
                r.label.toLowerCase().includes(needle) ||
                r.hint.toLowerCase().includes(needle)
              );
            }).map((r) => {
              const Icon = r.icon;
              return (
                <Command.Item
                  key={r.href}
                  value={`${r.label} ${r.hint}`}
                  onSelect={() => go(r.href)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-white/5"
                >
                  <div className="w-6 h-6 rounded-md border border-paper-border flex items-center justify-center text-ink-muted">
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{r.label}</div>
                    <div className="text-[10px] text-ink-subtle truncate">{r.hint}</div>
                  </div>
                  <ArrowRight size={12} className="text-ink-subtle" />
                </Command.Item>
              );
            })}
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between px-3 py-2 border-t border-paper-border text-[10px] text-ink-subtle">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="kbd">↵</span>
              open
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
            anywhere
          </span>
        </div>
      </Command>
    </div>
  );
}
