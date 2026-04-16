"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { respondToBroadcast } from "@/app/agency/broadcasts/actions";

export function BroadcastCard({
  id,
  body,
  senderName,
  sentAt,
  job,
}: {
  id: string;
  body: string;
  senderName: string;
  sentAt: string;
  job: { title: string; start: string; end: string; city: string | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"PENDING" | "ACCEPTED" | "DECLINED">("PENDING");
  const [error, setError] = useState<string | null>(null);

  function respond(resp: "ACCEPT" | "DECLINE") {
    setError(null);
    startTransition(async () => {
      const res = await respondToBroadcast({ broadcastId: id, response: resp });
      if (!res.ok) setError(res.error);
      else setStatus(resp === "ACCEPT" ? "ACCEPTED" : "DECLINED");
    });
  }

  return (
    <article className="ll-card p-4">
      <header className="flex items-center justify-between text-xs text-ink-subtle">
        <span>From {senderName}</span>
        <span>{new Date(sentAt).toLocaleString()}</span>
      </header>
      {job && (
        <div className="mt-2 text-xs text-ink-muted">
          <strong className="text-ink">{job.title}</strong>
          {" · "}{job.start} → {job.end}
          {job.city ? ` · ${job.city}` : ""}
        </div>
      )}
      <p className="mt-3 text-sm whitespace-pre-wrap">{body}</p>
      {status === "PENDING" ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => respond("ACCEPT")}
            disabled={pending}
            className="ll-btn-primary flex-1"
          >
            <Check size={14} /> Available
          </button>
          <button
            onClick={() => respond("DECLINE")}
            disabled={pending}
            className="ll-btn-secondary flex-1"
          >
            <X size={14} /> Can&apos;t make it
          </button>
        </div>
      ) : (
        <p
          className={`mt-4 text-sm ${
            status === "ACCEPTED" ? "text-board-confirmed" : "text-ink-muted"
          }`}
        >
          {status === "ACCEPTED" ? "You said yes." : "You declined."}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </article>
  );
}
