"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Copy, Trash2, Calendar, MapPin, Users } from "lucide-react";
import { createCastingEvent, deleteCastingEvent } from "./actions";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  slotMinutes: number;
  startTime: string;
  endTime: string;
  code: string;
  bookingsCount: number;
};

export function CastingsClient({ events }: { events: EventRow[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">
          {events.length} casting{events.length === 1 ? "" : "s"}
        </span>
        <button onClick={() => setCreating((s) => !s)} className="ll-btn-primary">
          <Plus size={14} /> New casting
        </button>
      </div>

      {creating && <CreateForm onClose={() => setCreating(false)} />}

      {events.length === 0 ? (
        <div className="ll-card p-10 text-center">
          <Calendar size={22} className="mx-auto text-ink-subtle" />
          <p className="mt-2 text-sm text-ink-muted">
            No castings scheduled. Spin one up and share the public link with scouts or on socials.
          </p>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/casting/${event.code}` : null;

  function copyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function remove() {
    if (!confirm(`Delete "${event.title}"? Any existing bookings will be lost.`)) return;
    const fd = new FormData();
    fd.set("eventId", event.id);
    startTransition(async () => {
      await deleteCastingEvent(fd);
    });
  }

  return (
    <li className="ll-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-serif text-xl tracking-tight">{event.title}</div>
          <div className="mt-1 text-xs text-ink-muted inline-flex items-center gap-1">
            <Calendar size={11} /> {event.date} · {event.startTime}–{event.endTime}
          </div>
          {event.location && (
            <div className="mt-1 text-xs text-ink-muted inline-flex items-center gap-1">
              <MapPin size={11} /> {event.location}
            </div>
          )}
          <div className="mt-1 text-xs text-ink-muted inline-flex items-center gap-1">
            <Users size={11} /> {event.bookingsCount} booked · {event.slotMinutes}-min slots
          </div>
        </div>
        <button
          onClick={remove}
          disabled={pending}
          className="ll-btn-ghost text-xs text-ink-subtle hover:text-red-400"
          title="Delete"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-paper-border flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate text-[10px] bg-paper px-2 py-1.5 rounded border border-paper-border">
          {publicUrl ?? "…"}
        </code>
        <button onClick={copyLink} className="ll-btn-secondary text-xs">
          <Copy size={11} /> {copied ? "Copied" : "Copy"}
        </button>
        <Link
          href={`/agency/castings/${event.id}`}
          className="ll-btn-ghost text-xs"
        >
          Bookings
        </Link>
      </div>
    </li>
  );
}

function CreateForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createCastingEvent(fd);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="ll-card p-5 grid sm:grid-cols-2 gap-3">
      <h2 className="sm:col-span-2 font-medium">New casting</h2>
      <div className="sm:col-span-2">
        <label className="ll-label">Title</label>
        <input name="title" required className="ll-input" placeholder="Open call — New Faces" />
      </div>
      <div>
        <label className="ll-label">Date</label>
        <input type="date" name="date" required defaultValue={today} className="ll-input" />
      </div>
      <div>
        <label className="ll-label">Location</label>
        <input name="location" className="ll-input" placeholder="Studio, 12 Rue Réaumur" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
        <div>
          <label className="ll-label">Start</label>
          <input type="time" name="startTime" defaultValue="10:00" className="ll-input" />
        </div>
        <div>
          <label className="ll-label">End</label>
          <input type="time" name="endTime" defaultValue="18:00" className="ll-input" />
        </div>
        <div>
          <label className="ll-label">Slot (min)</label>
          <input
            type="number"
            name="slotMinutes"
            defaultValue={15}
            min={5}
            max={120}
            className="ll-input"
          />
        </div>
      </div>
      <div className="sm:col-span-2">
        <label className="ll-label">Description</label>
        <textarea
          name="description"
          rows={3}
          className="ll-input"
          placeholder="What to bring, format, dress code…"
        />
      </div>
      {error && <p className="sm:col-span-2 text-xs text-red-500">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="ll-btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="ll-btn-primary text-sm">
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
