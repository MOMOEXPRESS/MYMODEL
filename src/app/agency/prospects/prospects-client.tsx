"use client";

import { ProspectStatus } from "@prisma/client";
import { Plus, Trash2, Instagram, Mail, Phone, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { createProspect, deleteProspect, updateProspectStatus, convertProspectToModel } from "./actions";
import { initials } from "@/lib/utils";

type Prospect = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  city: string | null;
  source: string | null;
  notes: string | null;
  status: ProspectStatus;
  imageUrl: string | null;
  createdAt: string;
};

const COLUMNS: { status: ProspectStatus; label: string; index: string }[] = [
  { status: "NEW", label: "Spotted", index: "01" },
  { status: "CONTACTED", label: "Contacted", index: "02" },
  { status: "MEETING_BOOKED", label: "Meeting", index: "03" },
  { status: "SIGNED", label: "Signed", index: "04" },
  { status: "REJECTED", label: "No", index: "05" },
];

export function ProspectsClient({ prospects }: { prospects: Prospect[] }) {
  const [showForm, setShowForm] = useState(false);
  const byStatus = new Map<ProspectStatus, Prospect[]>();
  for (const p of prospects) {
    const list = byStatus.get(p.status) ?? [];
    list.push(p);
    byStatus.set(p.status, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 border-b border-paper-border pb-4">
        <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-subtle max-w-md leading-relaxed">
          Drag prospects through the pipeline — warm editorial cards, no SaaS chrome.
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="ll-btn-primary shrink-0">
            <Plus size={14} /> New prospect
          </button>
        )}
      </div>

      {showForm && <NewProspectForm onClose={() => setShowForm(false)} />}

      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            status={c.status}
            label={c.label}
            index={c.index}
            prospects={byStatus.get(c.status) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function Column({
  status,
  label,
  index,
  prospects,
}: {
  status: ProspectStatus;
  label: string;
  index: string;
  prospects: Prospect[];
}) {
  return (
    <div className="ll-kanban-col w-[min(100%,280px)] shrink-0 snap-start">
      <header className="px-4 py-4 border-b border-paper-border">
        <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-subtle">
          <span className="text-editorial-warm/70">//</span> {label}{" "}
          <span className="tabular-nums">{index}</span>
        </p>
        <p className="mt-1 font-serif text-lg text-ink tracking-tight">{prospects.length}</p>
      </header>
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[70vh]">
        {prospects.map((p) => (
          <ProspectCard key={p.id} prospect={p} />
        ))}
        {prospects.length === 0 && (
          <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-subtle text-center py-10">
            Empty
          </p>
        )}
      </div>
    </div>
  );
}

function ProspectCard({ prospect: p }: { prospect: Prospect }) {
  const [pending, startTransition] = useTransition();

  function change(next: ProspectStatus) {
    const fd = new FormData();
    fd.set("prospectId", p.id);
    fd.set("status", next);
    startTransition(async () => {
      await updateProspectStatus(fd);
    });
  }
  function destroy() {
    if (!confirm(`Remove ${p.name}?`)) return;
    const fd = new FormData();
    fd.set("prospectId", p.id);
    startTransition(async () => {
      await deleteProspect(fd);
    });
  }

  function sign() {
    if (!p.email) {
      alert("Add an email to the prospect first — it's how they'll claim their model account.");
      return;
    }
    const division =
      prompt(
        `Sign ${p.name} to the roster. Pick a division:\nWOMEN, MEN, CURVE, KIDS, TALENTS, NEW_FACES`,
        "WOMEN",
      ) ?? "";
    if (!division) return;
    const fd = new FormData();
    fd.set("prospectId", p.id);
    fd.set("division", division.toUpperCase());
    startTransition(async () => {
      const res = await convertProspectToModel(fd);
      if (!res.ok) alert(res.error);
    });
  }

  return (
    <article className="border border-paper-border bg-paper-elevated p-4 transition-colors hover:border-editorial-warm/25">
      <div className="flex items-start gap-3">
        {p.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={p.imageUrl}
            alt=""
            className="w-12 h-14 object-cover shrink-0 border border-paper-border"
          />
        ) : (
          <div className="w-12 h-14 shrink-0 flex items-center justify-center bg-paper-muted border border-paper-border font-serif text-lg text-editorial-warm/50">
            {initials(p.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-base tracking-tight text-ink truncate">{p.name}</h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-editorial text-ink-subtle">
            {[p.city, p.source].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </div>

      {(p.instagramHandle || p.email || p.phone) && (
        <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-ink-muted">
          {p.instagramHandle && (
            <a
              href={`https://instagram.com/${p.instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-editorial-warm transition-colors"
            >
              <Instagram size={11} />@{p.instagramHandle.replace("@", "")}
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="hover:text-editorial-warm transition-colors">
              <Mail size={11} />
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone}`} className="hover:text-editorial-warm transition-colors">
              <Phone size={11} />
            </a>
          )}
        </div>
      )}

      {p.notes && (
        <p className="mt-3 text-xs text-ink-muted leading-relaxed font-light line-clamp-3 border-t border-paper-border pt-3">
          {p.notes}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-paper-border pt-3">
        <select
          value={p.status}
          onChange={(e) => change(e.target.value as ProspectStatus)}
          disabled={pending}
          className="ll-input text-[10px] flex-1 px-2 py-1.5 h-auto font-mono uppercase tracking-wide"
        >
          <option value="NEW">Spotted</option>
          <option value="CONTACTED">Contacted</option>
          <option value="MEETING_BOOKED">Meeting</option>
          <option value="SIGNED">Signed</option>
          <option value="REJECTED">No</option>
        </select>
        <button
          onClick={destroy}
          disabled={pending}
          className="ll-btn-ghost p-2 border border-paper-border"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {p.status !== "SIGNED" && p.status !== "REJECTED" && (
        <button
          onClick={sign}
          disabled={pending}
          className="mt-2 w-full ll-btn-secondary text-[10px] py-2 font-mono uppercase tracking-editorial"
          title="Convert to a real model on your roster"
        >
          <UserPlus size={12} className="inline mr-1" /> Sign to roster
        </button>
      )}
    </article>
  );
}

function NewProspectForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createProspect(fd);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <form onSubmit={onSubmit} className="ll-card p-6 mb-8 space-y-4 border-editorial-warm/20">
      <p className="font-mono text-[10px] uppercase tracking-editorial text-ink-subtle">
        <span className="text-editorial-warm/70">//</span> New prospect
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <input name="name" required placeholder="Name" className="ll-input text-sm" />
        <input name="city" placeholder="City" className="ll-input text-sm" />
        <input
          name="source"
          placeholder="Source (instagram, street, referral)"
          className="ll-input text-sm"
        />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <input name="email" type="email" placeholder="Email" className="ll-input text-sm" />
        <input name="phone" placeholder="Phone" className="ll-input text-sm" />
        <input name="instagramHandle" placeholder="@instagram" className="ll-input text-sm" />
      </div>
      <input name="image" type="file" accept="image/*" className="ll-input text-sm" />
      <textarea name="notes" rows={2} placeholder="Notes" className="ll-input text-sm" />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="ll-btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="ll-btn-primary text-sm">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
