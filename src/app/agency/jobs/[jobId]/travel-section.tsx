"use client";

import { TravelType } from "@prisma/client";
import { Plane, Train, Hotel, Car, Truck, Plus, Trash2, Package } from "lucide-react";
import { useState, useTransition } from "react";
import { addTravelItem, deleteTravelItem } from "./travel-actions";

type TravelRow = {
  id: string;
  type: TravelType;
  title: string;
  description: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  startAt: string | null;
  endAt: string | null;
  reference: string | null;
  modelId: string | null;
  modelName: string | null;
};

type ModelOpt = { userId: string; displayName: string };

const ICON: Record<TravelType, React.ReactNode> = {
  FLIGHT: <Plane size={14} />,
  TRAIN: <Train size={14} />,
  HOTEL: <Hotel size={14} />,
  TRANSFER: <Truck size={14} />,
  CAR: <Car size={14} />,
  OTHER: <Package size={14} />,
};

export function TravelSection({
  jobId,
  items,
  assignedModels,
  readOnly = false,
}: {
  jobId: string;
  items: TravelRow[];
  assignedModels: ModelOpt[];
  readOnly?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="ll-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Travel &amp; logistics</h2>
          <p className="text-xs text-ink-subtle mt-0.5">
            Flights, hotels, and transfers attached to this job.
          </p>
        </div>
        {!readOnly && !showForm && (
          <button onClick={() => setShowForm(true)} className="ll-btn-secondary text-xs">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {items.length === 0 && !showForm ? (
        <p className="mt-4 text-sm text-ink-muted">
          No travel booked yet. Add flights, hotels or transfers — they appear in the
          model&apos;s Next up automatically.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-paper-border">
          {items.map((it) => (
            <TravelRowView key={it.id} item={it} readOnly={readOnly} />
          ))}
        </ul>
      )}

      {showForm && (
        <TravelForm
          jobId={jobId}
          assignedModels={assignedModels}
          onCancel={() => setShowForm(false)}
          onAdded={() => setShowForm(false)}
        />
      )}
    </section>
  );
}

function TravelRowView({ item, readOnly }: { item: TravelRow; readOnly: boolean }) {
  const [pending, startTransition] = useTransition();
  function remove() {
    if (!confirm(`Remove "${item.title}"?`)) return;
    const fd = new FormData();
    fd.set("itemId", item.id);
    startTransition(() => {
      deleteTravelItem(fd);
    });
  }
  return (
    <li className="py-3 flex items-start gap-3 text-sm">
      <div className="w-8 h-8 rounded-md bg-paper border border-paper-border flex items-center justify-center text-ink-muted shrink-0">
        {ICON[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{item.title}</div>
        <div className="text-xs text-ink-muted mt-0.5 flex flex-wrap gap-x-2">
          <span>{item.type.toLowerCase()}</span>
          {item.fromLocation && <span>· {item.fromLocation} → {item.toLocation ?? ""}</span>}
          {item.startAt && <span>· {formatDateTime(item.startAt)}</span>}
          {item.endAt && <span>→ {formatDateTime(item.endAt)}</span>}
          {item.reference && <span>· Ref {item.reference}</span>}
          {item.modelName && <span>· For {item.modelName}</span>}
        </div>
        {item.description && (
          <p className="text-xs text-ink-muted mt-1 whitespace-pre-wrap">{item.description}</p>
        )}
      </div>
      {!readOnly && (
        <button onClick={remove} disabled={pending} className="ll-btn-ghost p-1.5">
          <Trash2 size={13} />
        </button>
      )}
    </li>
  );
}

function TravelForm({
  jobId,
  assignedModels,
  onCancel,
  onAdded,
}: {
  jobId: string;
  assignedModels: ModelOpt[];
  onCancel: () => void;
  onAdded: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("jobId", jobId);
    setError(null);
    startTransition(async () => {
      const res = await addTravelItem(fd);
      if (!res.ok) setError(res.error);
      else onAdded();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 border-t border-paper-border pt-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <select name="type" defaultValue="FLIGHT" className="ll-input text-sm">
          <option value="FLIGHT">Flight</option>
          <option value="TRAIN">Train</option>
          <option value="HOTEL">Hotel</option>
          <option value="TRANSFER">Transfer</option>
          <option value="CAR">Car</option>
          <option value="OTHER">Other</option>
        </select>
        <select name="modelId" defaultValue="" className="ll-input text-sm">
          <option value="">For the whole job</option>
          {assignedModels.map((m) => (
            <option key={m.userId} value={m.userId}>
              For {m.displayName}
            </option>
          ))}
        </select>
      </div>
      <input name="title" required placeholder='"AF1234 CDG → MXP"' className="ll-input text-sm" />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="fromLocation" placeholder="From" className="ll-input text-sm" />
        <input name="toLocation" placeholder="To" className="ll-input text-sm" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="startAt" type="datetime-local" className="ll-input text-sm" />
        <input name="endAt" type="datetime-local" className="ll-input text-sm" />
      </div>
      <input name="reference" placeholder="PNR / booking ref" className="ll-input text-sm" />
      <textarea name="description" rows={2} placeholder="Notes" className="ll-input text-sm" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="ll-btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="ll-btn-primary text-sm">
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}
