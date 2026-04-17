"use client";

// Model-side widgets for /m/jobs/[id]:
//   - RatePanel: booker's proposed rate + counter-offer input
//   - CallsheetConfirm: "I've read this" button gated on a callsheet file
//   - CheckInButton: day-of "I'm on set" stamp
//   - LookBoardReactions: APPROVE / FLAG per outfit option

import { useState, useTransition } from "react";
import { Check, AlertTriangle, Flag, ThumbsUp, Receipt, FileCheck, MapPinned } from "lucide-react";
import {
  proposeCounterRate,
  confirmCallsheetRead,
  checkInOnSet,
  reactToOutfit,
} from "./decline-actions";

type RatePanelProps = {
  jobId: string;
  rate: number | null;
  rateType: string | null;
  currency: string;
  counterRate: number | null;
  counterNote: string | null;
};

export function RatePanel(props: RatePanelProps) {
  const { jobId, rate, rateType, currency, counterRate, counterNote } = props;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(
    counterRate != null ? String(counterRate) : rate != null ? String(rate) : "",
  );
  const [note, setNote] = useState(counterNote ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function send() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a positive number");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await proposeCounterRate({ jobId, proposedRate: n, note: note.trim() || null });
      if (!res.ok) setError(res.error);
      else {
        setSent(true);
        setOpen(false);
      }
    });
  }

  return (
    <section className="ll-card p-5">
      <div className="flex items-start gap-3">
        <Receipt size={16} className="mt-0.5 text-ink-muted" />
        <div className="flex-1">
          <h2 className="font-medium">Rate</h2>
          {rate != null ? (
            <p className="mt-1 text-sm text-ink-muted">
              Agency proposed{" "}
              <span className="font-medium text-ink">
                {currency} {rate.toLocaleString()}
              </span>{" "}
              {rateType ? <span className="text-xs">/ {rateType.toLowerCase()}</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Rate not set yet — your agency will confirm.</p>
          )}
          {counterRate != null && (
            <p className="mt-2 text-xs text-amber-500 inline-flex items-center gap-1">
              <AlertTriangle size={12} />
              Your counter of {currency} {counterRate.toLocaleString()} is awaiting reply.
            </p>
          )}
          {sent && <p className="mt-2 text-xs text-board-confirmed">Counter-offer sent.</p>}
        </div>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="ll-btn-ghost text-xs"
        >
          {open ? "Cancel" : counterRate != null ? "Update counter" : "Counter rate"}
        </button>
      </div>
      {open && (
        <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-2">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Your rate in ${currency}`}
            className="ll-input text-sm"
          />
          <button onClick={send} disabled={pending} className="ll-btn-primary">
            {pending ? "Sending…" : "Send to agency"}
          </button>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional — context for the booker"
            className="ll-input text-sm sm:col-span-2"
          />
          {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
        </div>
      )}
    </section>
  );
}

export function CallsheetConfirm({
  jobId,
  callsheetUrl,
  confirmedAt,
}: {
  jobId: string;
  callsheetUrl: string | null;
  confirmedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(Boolean(confirmedAt));
  const [error, setError] = useState<string | null>(null);

  if (!callsheetUrl) return null;

  function ack() {
    setError(null);
    startTransition(async () => {
      const res = await confirmCallsheetRead({ jobId });
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <section className="ll-card p-5">
      <div className="flex items-start gap-3">
        <FileCheck size={16} className="mt-0.5 text-ink-muted" />
        <div className="flex-1">
          <h2 className="font-medium">Callsheet</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Open the latest callsheet and confirm you&apos;ve read it so the booker knows it
            landed.
          </p>
          <a
            href={callsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs underline text-ink"
          >
            View callsheet
          </a>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs text-board-confirmed">
            <Check size={12} /> Acknowledged
          </span>
        ) : (
          <button onClick={ack} disabled={pending} className="ll-btn-primary text-xs">
            {pending ? "Sending…" : "I've read it"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

export function CheckInButton({
  jobId,
  isShootDay,
  checkedInAt,
}: {
  jobId: string;
  isShootDay: boolean;
  checkedInAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(Boolean(checkedInAt));
  const [error, setError] = useState<string | null>(null);

  if (!isShootDay && !done) return null;

  function go() {
    setError(null);
    startTransition(async () => {
      const res = await checkInOnSet({ jobId });
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <section className="ll-card p-5">
      <div className="flex items-start gap-3">
        <MapPinned size={16} className="mt-0.5 text-ink-muted" />
        <div className="flex-1">
          <h2 className="font-medium">On set</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {done
              ? "You're checked in. The booker sees it live."
              : "Hit the button when you arrive so your agency stops worrying."}
          </p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs text-board-confirmed">
            <Check size={12} /> Checked in
          </span>
        ) : (
          <button onClick={go} disabled={pending} className="ll-btn-primary text-xs">
            {pending ? "…" : "I'm on set"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}

type Outfit = {
  id: string;
  title: string;
  imageUrl: string;
  notes: string | null;
  myReaction: "APPROVE" | "FLAG" | null;
  myNote: string | null;
};

export function LookBoardReactions({ outfits }: { outfits: Outfit[] }) {
  if (outfits.length === 0) return null;
  return (
    <section className="ll-card p-5">
      <h2 className="font-medium">Look board</h2>
      <p className="text-xs text-ink-muted mt-0.5">
        Approve or flag each outfit — flag with a note if something won&apos;t fit or feels off-brief.
      </p>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {outfits.map((o) => (
          <OutfitCard key={o.id} outfit={o} />
        ))}
      </div>
    </section>
  );
}

function OutfitCard({ outfit }: { outfit: Outfit }) {
  const [reaction, setReaction] = useState(outfit.myReaction);
  const [flagOpen, setFlagOpen] = useState(false);
  const [note, setNote] = useState(outfit.myNote ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function send(r: "APPROVE" | "FLAG", n: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await reactToOutfit({ optionId: outfit.id, reaction: r, note: n });
      if (!res.ok) setError(res.error);
      else {
        setReaction(r);
        if (r !== "FLAG") setFlagOpen(false);
      }
    });
  }

  return (
    <div className="border border-paper-border rounded-lg overflow-hidden bg-paper-elevated">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={outfit.imageUrl} alt={outfit.title} className="w-full aspect-[3/4] object-cover" />
      <div className="p-2.5">
        <div className="text-xs font-medium truncate">{outfit.title}</div>
        {outfit.notes && <div className="mt-1 text-[10px] text-ink-muted line-clamp-2">{outfit.notes}</div>}
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={() => send("APPROVE", null)}
            disabled={pending}
            className={`flex-1 text-[10px] py-1 rounded border inline-flex items-center justify-center gap-1 ${reaction === "APPROVE" ? "bg-board-confirmed/20 border-board-confirmed/40 text-board-confirmed" : "border-paper-border text-ink-muted hover:text-ink"}`}
          >
            <ThumbsUp size={10} /> Approve
          </button>
          <button
            type="button"
            onClick={() => setFlagOpen((s) => !s)}
            disabled={pending}
            className={`flex-1 text-[10px] py-1 rounded border inline-flex items-center justify-center gap-1 ${reaction === "FLAG" ? "bg-red-500/20 border-red-500/40 text-red-400" : "border-paper-border text-ink-muted hover:text-ink"}`}
          >
            <Flag size={10} /> Flag
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
              Send flag
            </button>
          </div>
        )}
        {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
      </div>
    </div>
  );
}
