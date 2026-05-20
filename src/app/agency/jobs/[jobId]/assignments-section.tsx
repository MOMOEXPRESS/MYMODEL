"use client";

import { AssignmentStatus, ClientReactionType, Division, RateType } from "@prisma/client";
import { Plus, UserPlus, X, Trash2, AlertTriangle, Check, MessageSquare, FileCheck, MapPinned, Flag, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { attachModelsToJob, removeAssignment, updateAssignment, respondToCounterOffer } from "../actions";
import { assignmentStatusOptionLabel } from "@/lib/status-language";
import { cn, initials } from "@/lib/utils";

type AssignmentRow = {
  id: string;
  status: AssignmentStatus;
  rate: number | null;
  rateType: RateType | null;
  notes: string | null;
  callTime: string | null;
  wrapTime: string | null;
  modelProposedRate: number | null;
  modelRateNote: string | null;
  callsheetReadAt: string | null;
  checkedInAt: string | null;
  clientReaction: ClientReactionType | null;
  clientReactionNote: string | null;
  model: {
    userId: string;
    displayName: string;
    division: Division;
  };
};

type RosterRow = {
  userId: string;
  displayName: string;
  division: Division;
  email: string;
};

const STATUS_ORDER: AssignmentStatus[] = [
  "CONFIRMED",
  "OPTION_1",
  "OPTION_2",
  "OPTION_3",
  "PROPOSED",
  "DECLINED",
  "RELEASED",
  "DONE",
];

const STATUS_STYLE: Record<AssignmentStatus, string> = {
  PROPOSED: "bg-paper-border/60 text-ink-muted",
  OPTION_1: "bg-board-option1/20 text-board-option1",
  OPTION_2: "bg-board-option2/60 text-ink",
  OPTION_3: "bg-board-option3 text-ink",
  CONFIRMED: "bg-board-confirmed/20 text-board-confirmed",
  DECLINED: "bg-paper-border/60 text-ink-subtle line-through",
  RELEASED: "bg-paper-border/60 text-ink-muted",
  DONE: "bg-paper-border/60 text-ink-muted",
};

export function AssignmentsSection({
  job,
  assignments,
  roster,
}: {
  job: { id: string; defaultRate: number | null; rateType: RateType; currency: string };
  assignments: AssignmentRow[];
  roster: RosterRow[];
}) {
  const [openDialog, setOpenDialog] = useState(false);

  const sorted = useMemo(
    () =>
      [...assignments].sort((a, b) => {
        const ai = STATUS_ORDER.indexOf(a.status);
        const bi = STATUS_ORDER.indexOf(b.status);
        if (ai !== bi) return ai - bi;
        return a.model.displayName.localeCompare(b.model.displayName);
      }),
    [assignments],
  );

  const attachedIds = new Set(assignments.map((a) => a.model.userId));
  const available = roster.filter((r) => !attachedIds.has(r.userId));

  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Models</h2>
          <p className="text-xs text-ink-subtle mt-0.5">
            {assignments.length === 0
              ? "Attach models to start gathering options."
              : `${assignments.length} on this job.`}
          </p>
        </div>
        <button onClick={() => setOpenDialog(true)} className="ll-btn-primary text-xs">
          <UserPlus size={14} /> Attach models
        </button>
      </div>

      {sorted.length > 0 && (
        <div className="mt-4 divide-y divide-paper-border">
          {sorted.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              jobDefaultRate={job.defaultRate}
              jobRateType={job.rateType}
              jobCurrency={job.currency}
            />
          ))}
        </div>
      )}

      {openDialog && (
        <AttachDialog
          jobId={job.id}
          roster={available}
          onClose={() => setOpenDialog(false)}
        />
      )}
    </section>
  );
}

// ─── One row ─────────────────────────────────────────────────────

function AssignmentRow({
  assignment,
  jobDefaultRate,
  jobRateType,
  jobCurrency,
}: {
  assignment: AssignmentRow;
  jobDefaultRate: number | null;
  jobRateType: RateType;
  jobCurrency: string;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<AssignmentStatus>(assignment.status);
  const [rate, setRate] = useState<string>(
    assignment.rate != null ? String(assignment.rate) : "",
  );
  const [callTime, setCallTime] = useState<string>(assignment.callTime ?? "");
  const [wrapTime, setWrapTime] = useState<string>(assignment.wrapTime ?? "");
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<
    { jobId: string; jobTitle: string; dates: string[] }[] | null
  >(null);
  const [exclusivityPrompt, setExclusivityPrompt] = useState<string | null>(null);

  function save(next: AssignmentStatus, overrides: { conflicts?: boolean; exclusivity?: boolean } = {}) {
    const fd = new FormData();
    fd.set("assignmentId", assignment.id);
    fd.set("status", next);
    if (rate !== "") fd.set("rate", rate);
    if (callTime) fd.set("callTime", callTime);
    if (wrapTime) fd.set("wrapTime", wrapTime);
    if (overrides.conflicts) fd.set("confirmConflicts", "1");
    if (overrides.exclusivity) fd.set("confirmExclusivity", "1");
    setError(null);
    setConflicts(null);
    setExclusivityPrompt(null);
    startTransition(async () => {
      const res = await updateAssignment(fd);
      if (!res.ok && "conflict" in res && res.conflict) {
        setConflicts(res.conflicts ?? []);
        return;
      }
      if (!res.ok && "exclusivityConflict" in res && res.exclusivityConflict) {
        setExclusivityPrompt(res.error);
        return;
      }
      if (!res.ok) setError(res.error);
      else setStatus(next);
    });
  }

  function respondCounter(decision: "accept" | "reject") {
    const fd = new FormData();
    fd.set("assignmentId", assignment.id);
    fd.set("decision", decision);
    startTransition(async () => {
      const res = await respondToCounterOffer(fd);
      if (!res.ok) setError(res.error);
    });
  }

  function remove() {
    if (!confirm(`Remove ${assignment.model.displayName} from this job?`)) return;
    const fd = new FormData();
    fd.set("assignmentId", assignment.id);
    startTransition(async () => {
      await removeAssignment(fd);
    });
  }

  const effectiveRate = assignment.rate ?? jobDefaultRate;
  const effectiveRateType = assignment.rateType ?? jobRateType;

  return (
    <div className="py-3 flex items-center gap-3 flex-wrap">
      <Link
        href={`/agency/models/${assignment.model.userId}`}
        className="flex items-center gap-3 min-w-[180px] group"
      >
        <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
          {initials(assignment.model.displayName)}
        </div>
        <div>
          <div className="text-sm font-medium group-hover:underline underline-offset-4">
            {assignment.model.displayName}
          </div>
          <div className="text-[10px] text-ink-subtle uppercase tracking-wider">
            {assignment.model.division.replace("_", " ")}
          </div>
        </div>
      </Link>

      <select
        value={status}
        disabled={pending}
        onChange={(e) => save(e.target.value as AssignmentStatus)}
        className={cn("ll-input w-auto text-xs", STATUS_STYLE[status])}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {assignmentStatusOptionLabel(s, true)}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1 text-xs text-ink-muted">
        <span>{jobCurrency}</span>
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={() => {
            if ((assignment.rate ?? null) !== (rate === "" ? null : Number(rate))) {
              save(status);
            }
          }}
          placeholder={jobDefaultRate != null ? String(jobDefaultRate) : "rate"}
          className="ll-input w-24 text-xs"
        />
        <span>/ {effectiveRateType.toLowerCase()}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-ink-muted">
        <span className="text-[10px] uppercase tracking-wider">Call</span>
        <input
          type="time"
          value={callTime}
          onChange={(e) => setCallTime(e.target.value)}
          onBlur={() => {
            if ((assignment.callTime ?? "") !== callTime) save(status);
          }}
          className="ll-input w-24 text-xs"
        />
        <span className="text-[10px] uppercase tracking-wider">Wrap</span>
        <input
          type="time"
          value={wrapTime}
          onChange={(e) => setWrapTime(e.target.value)}
          onBlur={() => {
            if ((assignment.wrapTime ?? "") !== wrapTime) save(status);
          }}
          className="ll-input w-24 text-xs"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={remove}
          disabled={pending}
          className="ll-btn-ghost text-xs"
          title="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {effectiveRate == null && (
        <span className="text-[11px] text-ink-subtle w-full">No rate set</span>
      )}

      {error && <p className="text-xs text-red-600 w-full">{error}</p>}

      {conflicts && (
        <div className="w-full mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-xs text-red-800">
              <p className="font-medium">
                {assignment.model.displayName} is already CONFIRMED on another job.
              </p>
              <ul className="mt-1 space-y-0.5">
                {conflicts.map((c) => (
                  <li key={c.jobId}>
                    <Link
                      href={`/agency/jobs/${c.jobId}`}
                      className="underline underline-offset-2"
                    >
                      {c.jobTitle}
                    </Link>{" "}
                    · {c.dates.join(", ")}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => save(AssignmentStatus.CONFIRMED, { conflicts: true })}
                  className="ll-btn-secondary text-xs"
                >
                  <Check size={12} /> Confirm anyway
                </button>
                <button
                  onClick={() => setConflicts(null)}
                  className="ll-btn-ghost text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {exclusivityPrompt && (
        <div className="w-full mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-xs text-amber-200">
              <p className="font-medium">{exclusivityPrompt}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => save(AssignmentStatus.CONFIRMED, { exclusivity: true })}
                  className="ll-btn-secondary text-xs"
                >
                  <Check size={12} /> Override exclusivity
                </button>
                <button
                  onClick={() => setExclusivityPrompt(null)}
                  className="ll-btn-ghost text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignment.modelProposedRate != null && (
        <div className="w-full mt-2 rounded-lg border border-accent/40 bg-accent-soft/20 p-3">
          <div className="flex items-start gap-2">
            <MessageSquare size={14} className="text-accent mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 text-xs text-ink">
              <p className="font-medium">
                {assignment.model.displayName} counter-offered{" "}
                <span className="text-accent">
                  {jobCurrency} {assignment.modelProposedRate.toLocaleString()}
                </span>
              </p>
              {assignment.modelRateNote && (
                <p className="mt-1 text-ink-muted">&ldquo;{assignment.modelRateNote}&rdquo;</p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => respondCounter("accept")}
                  disabled={pending}
                  className="ll-btn-primary text-xs"
                >
                  Accept rate
                </button>
                <button
                  onClick={() => respondCounter("reject")}
                  disabled={pending}
                  className="ll-btn-secondary text-xs"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(assignment.callsheetReadAt || assignment.checkedInAt || assignment.clientReaction) && (
        <div className="w-full mt-1 flex flex-wrap gap-3 text-[10px] text-ink-muted">
          {assignment.callsheetReadAt && (
            <span className="inline-flex items-center gap-1">
              <FileCheck size={11} /> Callsheet read{" "}
              {new Date(assignment.callsheetReadAt).toLocaleDateString()}
            </span>
          )}
          {assignment.checkedInAt && (
            <span className="inline-flex items-center gap-1 text-board-confirmed">
              <MapPinned size={11} /> On set{" "}
              {new Date(assignment.checkedInAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {assignment.clientReaction === "APPROVE" && (
            <span className="inline-flex items-center gap-1 text-board-confirmed">
              <ThumbsUp size={11} /> Client approved
            </span>
          )}
          {assignment.clientReaction === "FLAG" && (
            <span className="inline-flex items-center gap-1 text-red-400">
              <Flag size={11} /> Client flagged
              {assignment.clientReactionNote ? ` — ${assignment.clientReactionNote}` : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attach-models dialog ─────────────────────────────────────────

function AttachDialog({
  jobId,
  roster,
  onClose,
}: {
  jobId: string;
  roster: RosterRow[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [division, setDivision] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = roster.filter((m) => {
    if (division && m.division !== division) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (!m.displayName.toLowerCase().includes(needle) && !m.email.toLowerCase().includes(needle))
        return false;
    }
    return true;
  });

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function attach() {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.set("jobId", jobId);
    for (const id of selected) fd.append("modelIds", id);
    setError(null);
    startTransition(async () => {
      const res = await attachModelsToJob(fd);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="ll-card w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
        <header className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-paper-border">
          <div>
            <h3 className="font-medium">Attach models</h3>
            <p className="text-xs text-ink-subtle mt-0.5">
              Picks become proposed. Promote to on hold or booked next.
            </p>
          </div>
          <button onClick={onClose} className="ll-btn-ghost p-1.5">
            <X size={16} />
          </button>
        </header>

        <div className="px-5 py-3 flex items-center gap-2 border-b border-paper-border">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="ll-input flex-1 text-sm"
          />
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="ll-input w-auto text-xs"
          >
            <option value="">All divisions</option>
            <option value="WOMEN">Women</option>
            <option value="MEN">Men</option>
            <option value="CURVE">Curve</option>
            <option value="KIDS">Kids</option>
            <option value="TALENTS">Talents</option>
            <option value="NEW_FACES">New faces</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-ink-muted">No models match.</div>
          ) : (
            <ul>
              {filtered.map((m) => {
                const isSel = selected.has(m.userId);
                return (
                  <li key={m.userId}>
                    <button
                      onClick={() => toggle(m.userId)}
                      className={cn(
                        "w-full px-5 py-2.5 flex items-center gap-3 text-left border-b border-paper-border/70 last:border-0 hover:bg-paper/70",
                        isSel && "bg-accent-soft/40",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                          isSel ? "bg-ink border-ink text-paper" : "border-paper-border",
                        )}
                      >
                        {isSel && <Check size={12} />}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center shrink-0">
                        {initials(m.displayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{m.displayName}</div>
                        <div className="text-[10px] text-ink-subtle uppercase tracking-wider">
                          {m.division.replace("_", " ")}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && <p className="px-5 py-2 text-xs text-red-600">{error}</p>}

        <footer className="px-5 py-3 border-t border-paper-border flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="ll-btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={attach}
              disabled={pending || selected.size === 0}
              className="ll-btn-primary text-sm"
            >
              <Plus size={14} />
              {pending ? "Attaching…" : `Attach ${selected.size}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
