"use client";

import { ProspectStatus } from "@prisma/client";
import { Plus, Trash2, Instagram, Mail, Phone, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { createProspect, deleteProspect, updateProspectStatus, convertProspectToModel } from "./actions";
import { cn, initials } from "@/lib/utils";

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

const COLUMNS: { status: ProspectStatus; label: string }[] = [
  { status: "NEW", label: "Spotted" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "MEETING_BOOKED", label: "Meeting" },
  { status: "SIGNED", label: "Signed" },
  { status: "REJECTED", label: "No" },
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
      <div className="flex items-center justify-end mb-4">
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="ll-btn-primary">
            <Plus size={14} /> New prospect
          </button>
        )}
      </div>

      {showForm && <NewProspectForm onClose={() => setShowForm(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            status={c.status}
            label={c.label}
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
  prospects,
}: {
  status: ProspectStatus;
  label: string;
  prospects: Prospect[];
}) {
  return (
    <div className="ll-card p-3 min-h-[260px]">
      <div className="text-[10px] uppercase tracking-widest text-ink-subtle mb-2 flex justify-between">
        <span>{label}</span>
        <span>{prospects.length}</span>
      </div>
      <div className="space-y-2">
        {prospects.map((p) => (
          <ProspectCard key={p.id} prospect={p} />
        ))}
        {prospects.length === 0 && (
          <p className="text-xs text-ink-subtle text-center py-6">—</p>
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
    <div className="p-2 rounded-lg border border-paper-border bg-paper-elevated">
      <div className="flex items-start gap-2">
        {p.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center shrink-0">
            {initials(p.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{p.name}</div>
          <div className="text-[10px] text-ink-subtle mt-0.5 flex flex-wrap gap-x-1.5">
            {p.city && <span>{p.city}</span>}
            {p.source && <span>· {p.source}</span>}
          </div>
        </div>
      </div>

      {(p.instagramHandle || p.email || p.phone) && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-muted">
          {p.instagramHandle && (
            <a
              href={`https://instagram.com/${p.instagramHandle.replace("@", "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-ink"
            >
              <Instagram size={11} />@{p.instagramHandle.replace("@", "")}
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className="inline-flex items-center gap-0.5 hover:text-ink">
              <Mail size={11} />
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone}`} className="inline-flex items-center gap-0.5 hover:text-ink">
              <Phone size={11} />
            </a>
          )}
        </div>
      )}

      {p.notes && <p className="mt-2 text-[11px] text-ink-muted line-clamp-2">{p.notes}</p>}

      <div className="mt-2 flex items-center gap-1">
        <select
          value={p.status}
          onChange={(e) => change(e.target.value as ProspectStatus)}
          disabled={pending}
          className="ll-input text-[10px] w-full px-1 py-1 h-auto"
        >
          <option value="NEW">Spotted</option>
          <option value="CONTACTED">Contacted</option>
          <option value="MEETING_BOOKED">Meeting</option>
          <option value="SIGNED">Signed</option>
          <option value="REJECTED">No</option>
        </select>
        <button onClick={destroy} disabled={pending} className="ll-btn-ghost p-1" title="Delete">
          <Trash2 size={11} />
        </button>
      </div>

      {p.status !== "SIGNED" && p.status !== "REJECTED" && (
        <button
          onClick={sign}
          disabled={pending}
          className="mt-1.5 w-full ll-btn-primary text-[10px] py-1"
          title="Convert to a real model on your roster"
        >
          <UserPlus size={11} /> Sign to roster
        </button>
      )}
    </div>
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
    <form onSubmit={onSubmit} className="ll-card p-5 mb-4 space-y-3">
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
      {error && <p className="text-xs text-red-600">{error}</p>}
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
