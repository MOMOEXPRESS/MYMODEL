"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { bookCastingSlot } from "./actions";

type Slot = { iso: string; label: string };

export function BookingForm({
  code,
  slots,
  allSlots,
}: {
  code: string;
  slots: Slot[];
  allSlots: number;
}) {
  const [slotIso, setSlotIso] = useState<string>(slots[0]?.iso ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (allSlots === 0) {
    return (
      <div className="ll-card p-6 text-sm text-ink-muted text-center">
        No slots have been set up yet.
      </div>
    );
  }

  if (done) {
    return (
      <div className="ll-card p-6 text-center">
        <div className="mx-auto w-10 h-10 rounded-full bg-board-confirmed/20 text-board-confirmed flex items-center justify-center">
          <Check size={20} />
        </div>
        <h3 className="mt-3 font-serif text-xl">You&apos;re booked</h3>
        <p className="mt-2 text-sm text-ink-muted">
          See you at <strong className="text-ink">{done}</strong>. Bring your ID. We&apos;ll send a
          reminder to {email}.
        </p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="ll-card p-6 text-sm text-ink-muted text-center">
        Every slot is booked. Check back — the agency may open more.
      </div>
    );
  }

  function submit() {
    if (!slotIso || !name.trim() || !email.trim()) {
      setError("Name, email and a slot are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await bookCastingSlot({
        code,
        slotStartIso: slotIso,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
      });
      if (!res.ok) setError(res.error);
      else {
        const label = slots.find((s) => s.iso === slotIso)?.label ?? "";
        setDone(label);
      }
    });
  }

  return (
    <div className="ll-card p-5 space-y-4">
      <h2 className="font-medium">Book a slot</h2>
      <div>
        <label className="ll-label">Pick a time</label>
        <select
          value={slotIso}
          onChange={(e) => setSlotIso(e.target.value)}
          className="ll-input text-sm"
        >
          {slots.map((s) => (
            <option key={s.iso} value={s.iso}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="ll-label">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="ll-input"
        />
      </div>
      <div>
        <label className="ll-label">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="ll-input"
        />
      </div>
      <div>
        <label className="ll-label">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="ll-input" />
      </div>
      <div>
        <label className="ll-label">
          Anything to mention? <span className="text-ink-subtle normal-case">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="ll-input text-sm"
          placeholder="Instagram handle, prior experience…"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button onClick={submit} disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Booking…" : "Book slot"}
      </button>
    </div>
  );
}
