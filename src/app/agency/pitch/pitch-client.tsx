"use client";

import { Division } from "@prisma/client";
import { useMemo, useState } from "react";
import { Check, Download, Users } from "lucide-react";
import { cn, initials } from "@/lib/utils";

type RosterRow = { userId: string; displayName: string; division: Division };

export function PitchDeckClient({ roster }: { roster: RosterRow[] }) {
  const [title, setTitle] = useState("Pitch");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((r) => r.displayName.toLowerCase().includes(needle));
  }, [roster, q]);

  function toggle(id: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function generate() {
    if (picked.size === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/pitch-deck", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Pitch",
          // Preserve picking order as a list — user sees the same order in PDF.
          modelIds: Array.from(picked),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(j.error ?? "Failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title.trim() || "Pitch").replace(/[^\w\-. ]+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <section className="ll-card p-5">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search roster"
            className="ll-input text-sm flex-1"
          />
          <span className="text-xs text-ink-muted inline-flex items-center gap-1">
            <Users size={13} /> {picked.size} picked
          </span>
        </div>

        <ul className="mt-3 max-h-[520px] overflow-auto divide-y divide-paper-border rounded-lg border border-paper-border">
          {filtered.map((m) => {
            const isSel = picked.has(m.userId);
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  onClick={() => toggle(m.userId)}
                  className={cn(
                    "w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-paper/70",
                    isSel && "bg-accent-soft/40",
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      isSel ? "bg-ink border-ink text-paper" : "border-paper-border",
                    )}
                  >
                    {isSel && <Check size={10} />}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center">
                    {initials(m.displayName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.displayName}</div>
                    <div className="text-[10px] text-ink-subtle uppercase tracking-wider">
                      {m.division.replace("_", " ")}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-ink-subtle">No models match.</li>
          )}
        </ul>
      </section>

      <section className="ll-card p-5 space-y-4 lg:sticky lg:top-6 self-start">
        <div>
          <label className="ll-label">Deck title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='"Vogue Paris — July editorial"'
            className="ll-input"
          />
        </div>
        <div className="text-xs text-ink-muted">
          Cover page + one page per model with up to four photos and core measurements.
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={generate}
          disabled={pending || picked.size === 0}
          className="ll-btn-primary w-full"
        >
          <Download size={14} /> {pending ? "Rendering…" : `Export PDF (${picked.size})`}
        </button>
        {picked.size > 0 && (
          <button
            onClick={() => setPicked(new Set())}
            className="ll-btn-ghost w-full text-xs"
          >
            Clear selection
          </button>
        )}
      </section>
    </div>
  );
}
