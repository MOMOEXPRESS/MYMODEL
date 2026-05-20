"use client";

import { AssignmentStatus, ClientReactionType, Division } from "@prisma/client";
import { useState, useTransition } from "react";
import { Check, Flag, ThumbsUp } from "lucide-react";
import { clientReactToAssignment } from "./actions";
import { assignmentHoldDetail, assignmentSimpleLabel } from "@/lib/status-language";
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

export function ClientApprovals({
  token,
  assignments,
}: {
  token: string;
  assignments: ClientAssignment[];
}) {
  if (assignments.length === 0) {
    return (
      <div className="ll-card p-10 text-center text-sm text-ink-muted">
        No proposals yet. Once models are on hold, you&apos;ll see them here.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {assignments.map((a) => (
        <ModelCard key={a.id} token={token} a={a} />
      ))}
    </div>
  );
}

function ModelCard({ token, a }: { token: string; a: ClientAssignment }) {
  const [reaction, setReaction] = useState(a.clientReaction);
  const [flagOpen, setFlagOpen] = useState(false);
  const [note, setNote] = useState(a.clientReactionNote ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send(r: ClientReactionType, n: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await clientReactToAssignment({
        token,
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
    <div className="border border-paper-border rounded-lg overflow-hidden bg-paper-elevated">
      <div className="aspect-[3/4] bg-paper relative overflow-hidden">
        {a.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={a.imageUrl} alt={a.modelName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-soft/70 to-paper">
            <span className="font-serif text-5xl text-accent">{initials(a.modelName)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
          <div className="font-serif text-lg leading-none">{a.modelName}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
            {a.division.replace("_", " ")} ·{" "}
            {assignmentHoldDetail(a.status)
              ? `${assignmentSimpleLabel(a.status)} (${assignmentHoldDetail(a.status)})`
              : assignmentSimpleLabel(a.status)}
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => send("APPROVE", null)}
            disabled={pending}
            className={cn(
              "flex-1 text-[10px] py-1.5 rounded border inline-flex items-center justify-center gap-1",
              reaction === "APPROVE"
                ? "bg-board-confirmed/20 border-board-confirmed/40 text-board-confirmed"
                : "border-paper-border text-ink-muted hover:text-ink",
            )}
          >
            <ThumbsUp size={10} /> {reaction === "APPROVE" ? "Approved" : "Approve"}
          </button>
          <button
            type="button"
            onClick={() => setFlagOpen((s) => !s)}
            disabled={pending}
            className={cn(
              "flex-1 text-[10px] py-1.5 rounded border inline-flex items-center justify-center gap-1",
              reaction === "FLAG"
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : "border-paper-border text-ink-muted hover:text-ink",
            )}
          >
            <Flag size={10} /> {reaction === "FLAG" ? "Flagged" : "Flag"}
          </button>
        </div>
        {flagOpen && (
          <div className="mt-2 space-y-1">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Why flag?"
              className="ll-input text-xs"
            />
            <button
              type="button"
              onClick={() => send("FLAG", note.trim() || null)}
              disabled={pending}
              className="w-full ll-btn-primary text-xs py-1"
            >
              <Check size={11} /> Send flag
            </button>
          </div>
        )}
        {reaction === "FLAG" && a.clientReactionNote && !flagOpen && (
          <div className="mt-1 text-[10px] text-ink-muted italic">
            &ldquo;{a.clientReactionNote}&rdquo;
          </div>
        )}
        {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
      </div>
    </div>
  );
}
