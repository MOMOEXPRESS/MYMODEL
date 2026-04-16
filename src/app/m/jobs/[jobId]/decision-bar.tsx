"use client";

import { Check, X } from "lucide-react";
import { useState, useTransition } from "react";
import { modelDecideHold } from "./decline-actions";

export function HoldDecisionBar({
  jobId,
  status,
}: {
  jobId: string;
  status: "PROPOSED" | "OPTION_1" | "OPTION_2" | "OPTION_3" | "CONFIRMED" | "DECLINED" | "RELEASED" | "DONE";
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "ACCEPT" | "DECLINE") {
    let reason: string | undefined;
    if (decision === "DECLINE") {
      const r = prompt("Optional — why are you declining? (other booking, sick, etc.)");
      if (r === null) return; // user cancelled
      reason = r.trim() || undefined;
    }
    setError(null);
    startTransition(async () => {
      const res = await modelDecideHold({ jobId, decision, reason });
      if (!res.ok) setError(res.error);
      else setDone(decision === "ACCEPT" ? "ACCEPTED" : "DECLINED");
    });
  }

  if (status === "CONFIRMED" || status === "DONE") return null;
  if (status === "DECLINED" || done === "DECLINED") {
    return (
      <div className="ll-card p-4 bg-red-50/40 border-red-100">
        <p className="text-sm text-red-700">You declined this hold. The agency has been notified.</p>
      </div>
    );
  }
  if (done === "ACCEPTED") {
    return (
      <div className="ll-card p-4 bg-board-confirmed/10 border-board-confirmed/30">
        <p className="text-sm text-board-confirmed">
          You confirmed your availability. Your agency will follow up if they confirm you on the job.
        </p>
      </div>
    );
  }

  return (
    <div className="ll-card p-4 bg-board-option2/30">
      <p className="text-sm">
        Your agency has put you on hold for this job. Are you free for these dates?
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => decide("ACCEPT")}
          disabled={pending}
          className="ll-btn-primary flex-1"
        >
          <Check size={14} /> Yes, I&apos;m available
        </button>
        <button
          onClick={() => decide("DECLINE")}
          disabled={pending}
          className="ll-btn-secondary flex-1"
        >
          <X size={14} /> Can&apos;t make it
        </button>
      </div>
    </div>
  );
}
