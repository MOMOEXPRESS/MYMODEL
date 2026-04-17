"use client";

import { useState, useTransition } from "react";
import { createJob } from "../actions";

export function NewJobForm({ defaultCurrency }: { defaultCurrency: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createJob(fd);
      // server action redirects on success; only lands here on failure
      if (res && !res.ok) setError(res.error);
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="ll-card p-6 space-y-5">
      <div>
        <label className="ll-label" htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          required
          placeholder="Vogue Paris — Editorial, July issue"
          className="ll-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="ll-label" htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue="EDITORIAL" className="ll-input">
            <option value="EDITORIAL">Editorial</option>
            <option value="CAMPAIGN">Campaign</option>
            <option value="RUNWAY">Runway</option>
            <option value="FITTING">Fitting</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="EVENT">Event</option>
            <option value="TEST">Test</option>
          </select>
        </div>
        <div>
          <label className="ll-label" htmlFor="currency">Currency</label>
          <input
            id="currency"
            name="currency"
            defaultValue={defaultCurrency}
            maxLength={3}
            className="ll-input uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="ll-label" htmlFor="startDate">Start date</label>
          <input id="startDate" name="startDate" type="date" required defaultValue={today} className="ll-input" />
        </div>
        <div>
          <label className="ll-label" htmlFor="endDate">End date</label>
          <input id="endDate" name="endDate" type="date" required defaultValue={today} className="ll-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="ll-label" htmlFor="location">Location</label>
          <input id="location" name="location" placeholder="Studio Palais Royal, 5 rue de Valois" className="ll-input" />
        </div>
        <div>
          <label className="ll-label" htmlFor="locationCity">City</label>
          <input id="locationCity" name="locationCity" placeholder="Paris" className="ll-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="ll-label" htmlFor="defaultRate">Default rate</label>
          <input
            id="defaultRate"
            name="defaultRate"
            type="number"
            step="0.01"
            min={0}
            placeholder="1500"
            className="ll-input"
          />
        </div>
        <div>
          <label className="ll-label" htmlFor="rateType">Rate type</label>
          <select id="rateType" name="rateType" defaultValue="DAY" className="ll-input">
            <option value="DAY">Per day</option>
            <option value="FLAT">Flat</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </div>
      </div>

      <div>
        <label className="ll-label" htmlFor="brief">Brief</label>
        <textarea
          id="brief"
          name="brief"
          rows={5}
          placeholder="Concept, mood, references, wardrobe, hair & make-up notes…"
          className="ll-input"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="submit" disabled={pending} className="ll-btn-primary">
          {pending ? "Creating…" : "Create job"}
        </button>
      </div>
    </form>
  );
}
