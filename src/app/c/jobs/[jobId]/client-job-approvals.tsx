"use client";

import { AssignmentStatus, ClientReactionType, Division } from "@prisma/client";
import { useState, useTransition } from "react";
import { Check, Flag, ThumbsUp } from "lucide-react";
import { clientUserReactToAssignment } from "./actions";
import { assignmentSimpleLabel, assignmentHoldDetail } from "@/lib/status-language";
import { cn, initials } from "@/lib/utils";

type ClientAssignment = {
  id: string;
  status: AssignmentStatus;
  imageUrl: string | null;
  modelName: string;
  division: Division;
  clientReaction: ClientReactionType | null;
  clientReactionNote: string | null;
};

export function ClientJobApprovals({ assignments }: { assignments: ClientAssignment[] }) {
  if (assignments.length === 0) {
    return (
      <div className="ll-card p-10 text-center text-sm text-ink-muted">
        No models on hold yet. Your booker will add talent to the lineup.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {assignments.map((a) => (
        <ModelCard key={a.id} a={a} />
      ))}
    </div>
  );
}

function ModelCard({ a }: { a: ClientAssignment }) {
  const [reaction, setReaction] = useState(a.clientReaction);
  const [flagOpen, setFlagOpen] = useState(false);
  const [note, setNote] = useState(a.clientReactionNote ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const statusLabel = assignmentHoldDetail(a.status)
    ? `${assignmentSimpleLabel(a.status)} · ${assignmentHoldDetail(a.status)}`
    : assignmentSimpleLabel(a.status);

  function send(r: ClientReactionType, n: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await clientUserReactToAssignment({
        assignmentId: a.id,
        reaction: r,
        note: n,
      });
      if (!res.ok) setError(res.error);
      else {
        setReaction(r);
        if (r !== "FLAG") setFlagOpen(false);
      }
    });
  }

  return (
    <div className="ll-card overflow-hidden">
      <div className="aspect-[3/4] bg-paper-muted relative">
        {a.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={a.imageUrl} alt={a.modelName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-medium text-ink-subtle">
            {initials(a.modelName)}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm">{a.modelName}</p>
        <p className="text-[10px] text-ink-subtle uppercase tracking-wider">
          {a.division.replace("_", " ")} · {statusLabel}
        </p>
        {reaction && (
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              reaction === "APPROVE" ? "text-emerald-400" : "text-amber-400",
            )}
          >
            {reaction === "APPROVE" ? "Approved" : "Flagged"}
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => send("APPROVE", null)}
            className="ll-btn-secondary text-xs flex-1"
          >
            <ThumbsUp size={12} /> Approve
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setFlagOpen((v) => !v)}
            className="ll-btn-ghost text-xs"
          >
            <Flag size={12} />
          </button>
        </div>
        {flagOpen && (
          <div className="mt-2 space-y-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for booker"
              className="ll-input text-xs"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => send("FLAG", note)}
              className="ll-btn-primary text-xs w-full"
            >
              Send flag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
