"use client";

import { BroadcastResponseValue, Division } from "@prisma/client";
import { useMemo, useState, useTransition } from "react";
import { Check, X, Send, Users } from "lucide-react";
import { createBroadcast } from "./actions";
import { cn, initials } from "@/lib/utils";

type RosterModel = {
  userId: string;
  displayName: string;
  email: string;
  division: Division;
};

type JobLite = { id: string; title: string; start: string; end: string };

type Broadcast = {
  id: string;
  body: string;
  sentBy: string;
  sentAt: string;
  job: { id: string; title: string } | null;
  responses: {
    modelId: string;
    modelName: string;
    response: BroadcastResponseValue;
    respondedAt: string | null;
  }[];
};

export function BroadcastsClient({
  roster,
  jobs,
  broadcasts,
}: {
  roster: RosterModel[];
  jobs: JobLite[];
  broadcasts: Broadcast[];
}) {
  return (
    <div className="space-y-8">
      <Composer roster={roster} jobs={jobs} />
      <History broadcasts={broadcasts} />
    </div>
  );
}

function Composer({ roster, jobs }: { roster: RosterModel[]; jobs: JobLite[] }) {
  const [body, setBody] = useState("");
  const [jobId, setJobId] = useState<string>("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [division, setDivision] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const filtered = useMemo(() => {
    return roster.filter((m) => {
      if (division && m.division !== division) return false;
      if (q) {
        const needle = q.toLowerCase();
        if (!m.displayName.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [roster, q, division]);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function send() {
    if (body.trim().length === 0 || picked.size === 0) return;
    setError(null);
    setSent(false);
    startTransition(async () => {
      const res = await createBroadcast({
        body: body.trim(),
        jobId: jobId || undefined,
        modelIds: Array.from(picked),
      });
      if (!res.ok) setError(res.error);
      else {
        setSent(true);
        setBody("");
        setPicked(new Set());
        setJobId("");
      }
    });
  }

  return (
    <section className="ll-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Compose</h2>
          <p className="text-xs text-ink-subtle mt-0.5">
            Picks get the same message — they tap accept or decline in-app.
          </p>
        </div>
        <span className="text-xs text-ink-muted inline-flex items-center gap-1.5">
          <Users size={13} /> {picked.size} picked
        </span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={'"Editorial, Mar 10–12, Paris, €1,500/day. Available?"'}
        className="ll-input mt-4"
      />

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="ll-input text-sm">
          <option value="">Attach a job (optional)</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} ({j.start} → {j.end})
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="ll-input text-sm flex-1"
          />
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="ll-input text-sm w-auto"
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
      </div>

      <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-paper-border">
        <ul className="divide-y divide-paper-border">
          {filtered.map((m) => {
            const isSel = picked.has(m.userId);
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  onClick={() => toggle(m.userId)}
                  className={cn(
                    "w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-paper/70",
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
                  <div className="w-7 h-7 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center">
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
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {sent && <p className="mt-3 text-sm text-board-confirmed">Sent.</p>}

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={send}
          disabled={pending || picked.size === 0 || body.trim().length === 0}
          className="ll-btn-primary"
        >
          <Send size={14} /> {pending ? "Sending…" : `Send to ${picked.size}`}
        </button>
      </div>
    </section>
  );
}

function History({ broadcasts }: { broadcasts: Broadcast[] }) {
  if (broadcasts.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="font-medium">Recent broadcasts</h2>
      {broadcasts.map((b) => {
        const accepted = b.responses.filter((r) => r.response === "ACCEPT");
        const declined = b.responses.filter((r) => r.response === "DECLINE");
        const pending = b.responses.filter((r) => r.response === "NO_RESPONSE");
        return (
          <article key={b.id} className="ll-card p-5">
            <header className="flex items-center justify-between text-xs text-ink-subtle">
              <span>
                {b.sentBy} · {new Date(b.sentAt).toLocaleString()}
              </span>
              {b.job && <span>Attached to {b.job.title}</span>}
            </header>
            <p className="mt-2 text-sm whitespace-pre-wrap">{b.body}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <Counter label="Accepted" value={accepted.length} tone="bg-board-confirmed/20 text-board-confirmed" />
              <Counter label="Declined" value={declined.length} tone="bg-board-onJob/20 text-board-onJob" />
              <Counter label="Pending" value={pending.length} tone="bg-paper-border/70 text-ink-muted" />
            </dl>
            <details className="mt-3">
              <summary className="text-xs text-ink-subtle cursor-pointer">Who said what</summary>
              <ul className="mt-2 divide-y divide-paper-border text-xs">
                {b.responses.map((r) => (
                  <li key={r.modelId} className="py-1.5 flex items-center gap-2">
                    <span className="flex-1">{r.modelName}</span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md",
                        r.response === "ACCEPT" && "bg-board-confirmed/20 text-board-confirmed",
                        r.response === "DECLINE" && "bg-board-onJob/20 text-board-onJob",
                        r.response === "NO_RESPONSE" && "bg-paper-border/70 text-ink-muted",
                      )}
                    >
                      {r.response === "ACCEPT" ? (
                        <span className="inline-flex items-center gap-1">
                          <Check size={11} /> Yes
                        </span>
                      ) : r.response === "DECLINE" ? (
                        <span className="inline-flex items-center gap-1">
                          <X size={11} /> No
                        </span>
                      ) : (
                        "waiting"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </article>
        );
      })}
    </section>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={cn("rounded-lg px-3 py-2", tone)}>
      <dt className="uppercase tracking-wider text-[10px]">{label}</dt>
      <dd className="font-serif text-xl">{value}</dd>
    </div>
  );
}
