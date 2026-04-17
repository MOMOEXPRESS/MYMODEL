"use client";

// Look board for a job — booker/stylist uploads outfit tiles, each model on
// the job reacts (APPROVE / FLAG with note). Read-only on the model side.

import { useState, useTransition } from "react";
import { Flag, ThumbsUp, Plus, Trash2, Shirt } from "lucide-react";
import { addOutfitOption, deleteOutfitOption } from "../actions";
import { cn } from "@/lib/utils";

type OutfitRow = {
  id: string;
  title: string;
  imageUrl: string;
  notes: string | null;
  reactions: {
    modelName: string;
    reaction: "APPROVE" | "FLAG";
    note: string | null;
  }[];
};

export function LookBoardSection({
  jobId,
  outfits,
}: {
  jobId: string;
  outfits: OutfitRow[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium inline-flex items-center gap-2">
            <Shirt size={14} /> Look board
          </h2>
          <p className="text-xs text-ink-subtle mt-0.5">
            {outfits.length === 0
              ? "Upload outfits and let models flag anything that won't fit or feels off-brief."
              : `${outfits.length} outfit${outfits.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <button onClick={() => setOpen((s) => !s)} className="ll-btn-primary text-xs">
          <Plus size={14} /> {open ? "Close" : "Add outfit"}
        </button>
      </div>

      {open && <AddOutfitForm jobId={jobId} onDone={() => setOpen(false)} />}

      {outfits.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {outfits.map((o) => (
            <OutfitCard key={o.id} outfit={o} />
          ))}
        </div>
      )}
    </section>
  );
}

function AddOutfitForm({ jobId, onDone }: { jobId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const fd = new FormData();
    fd.set("jobId", jobId);
    fd.set("title", title.trim());
    fd.set("imageUrl", imageUrl.trim());
    if (notes.trim()) fd.set("notes", notes.trim());
    setError(null);
    startTransition(async () => {
      const res = await addOutfitOption(fd);
      if (!res.ok) setError(res.error);
      else {
        setTitle("");
        setImageUrl("");
        setNotes("");
        onDone();
      }
    });
  }

  return (
    <div className="mt-4 border border-paper-border rounded-lg p-3 grid sm:grid-cols-2 gap-3">
      <div>
        <label className="ll-label">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Look 1 — Opening"
          className="ll-input text-sm"
        />
      </div>
      <div>
        <label className="ll-label">Image URL</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          className="ll-input text-sm"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="ll-label">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Stylist notes, fabric, fit expectations…"
          className="ll-input text-sm"
        />
      </div>
      {error && <p className="sm:col-span-2 text-xs text-red-500">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button onClick={onDone} className="ll-btn-ghost text-xs">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending || !title.trim() || !imageUrl.trim()}
          className="ll-btn-primary text-xs"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

function OutfitCard({ outfit }: { outfit: OutfitRow }) {
  const [pending, startTransition] = useTransition();
  const approved = outfit.reactions.filter((r) => r.reaction === "APPROVE");
  const flagged = outfit.reactions.filter((r) => r.reaction === "FLAG");

  function remove() {
    if (!confirm(`Delete "${outfit.title}"?`)) return;
    const fd = new FormData();
    fd.set("optionId", outfit.id);
    startTransition(async () => {
      await deleteOutfitOption(fd);
    });
  }

  return (
    <div className="border border-paper-border rounded-lg overflow-hidden bg-paper-elevated">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={outfit.imageUrl} alt={outfit.title} className="w-full aspect-[3/4] object-cover" />
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{outfit.title}</div>
            {outfit.notes && (
              <div className="mt-0.5 text-[10px] text-ink-muted line-clamp-2">{outfit.notes}</div>
            )}
          </div>
          <button
            onClick={remove}
            disabled={pending}
            className="text-ink-subtle hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
        <div className="mt-2 flex gap-2 text-[10px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
              approved.length > 0
                ? "bg-board-confirmed/20 text-board-confirmed"
                : "text-ink-subtle",
            )}
          >
            <ThumbsUp size={10} /> {approved.length}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded",
              flagged.length > 0 ? "bg-red-500/20 text-red-400" : "text-ink-subtle",
            )}
          >
            <Flag size={10} /> {flagged.length}
          </span>
        </div>
        {flagged.length > 0 && (
          <ul className="mt-2 space-y-1 text-[10px] text-red-400 border-t border-paper-border pt-2">
            {flagged.map((r, i) => (
              <li key={i}>
                <span className="font-medium text-ink">{r.modelName}</span>
                {r.note ? ` — ${r.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
