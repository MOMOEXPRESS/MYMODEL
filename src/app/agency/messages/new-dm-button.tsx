"use client";

// Agency-side "Start new direct message" button.
// Opens a modal with the active roster; pick one and we get-or-create the
// conversation and route to its thread.

import { Division } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { MessageSquarePlus, Search, X } from "lucide-react";
import { cn, initials } from "@/lib/utils";

type Model = {
  userId: string;
  name: string;
  email: string;
  division: Division;
  avatarUrl: string | null;
};

export function NewDmButton({ roster }: { roster: Model[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [division, setDivision] = useState<Division | "">("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return roster.filter((m) => {
      if (division && m.division !== division) return false;
      if (!needle) return true;
      return m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle);
    });
  }, [roster, q, division]);

  function pick(modelUserId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelUserId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.conversationId) {
        setError(json.error ?? "Couldn't open conversation");
        return;
      }
      // Route by model id — the thread page looks up the conversation itself.
      router.push(`/agency/messages/${modelUserId}`);
      setOpen(false);
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="ll-btn-primary">
        <MessageSquarePlus size={14} /> New message
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="ll-card shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden animate-card-in"
          >
            <header className="px-5 py-3 border-b border-paper-border flex items-center justify-between">
              <h3 className="font-medium text-sm">Start a new message</h3>
              <button onClick={() => setOpen(false)} className="ll-btn-ghost p-1">
                <X size={14} />
              </button>
            </header>

            <div className="px-4 py-3 border-b border-paper-border flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search your roster"
                  className="ll-input pl-7 text-sm"
                />
              </div>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value as Division | "")}
                className="ll-input w-auto text-xs"
              >
                <option value="">All</option>
                <option value="WOMEN">Women</option>
                <option value="MEN">Men</option>
                <option value="CURVE">Curve</option>
                <option value="KIDS">Kids</option>
                <option value="TALENTS">Talents</option>
                <option value="NEW_FACES">New faces</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-ink-subtle">No models match.</p>
              ) : (
                <ul>
                  {filtered.map((m) => (
                    <li key={m.userId}>
                      <button
                        onClick={() => pick(m.userId)}
                        disabled={pending}
                        className={cn(
                          "w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-paper/60",
                        )}
                      >
                        {m.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={m.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center shrink-0">
                            {initials(m.name)}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-[11px] text-ink-subtle truncate">
                            {m.division.replace("_", " ").toLowerCase()} · {m.email}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="px-5 py-2 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
