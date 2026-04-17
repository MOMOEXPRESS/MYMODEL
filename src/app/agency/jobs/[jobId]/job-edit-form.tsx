"use client";

import { JobType, RateType } from "@prisma/client";
import { useState, useTransition } from "react";
import { updateJob } from "../actions";

type JobShape = {
  id: string;
  title: string;
  type: JobType;
  startDate: string;
  endDate: string;
  location: string | null;
  locationCity: string | null;
  brief: string | null;
  defaultRate: number | null;
  rateType: RateType;
  currency: string;
  usageTerritory: string | null;
  usageDuration: string | null;
  usageMedia: string[];
  usageExpiresAt: string | null;
  exclusivityCategory: string | null;
};

export function JobEditForm({ job }: { job: JobShape }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("jobId", job.id);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateJob(fd);
      if (!res.ok) setError(res.error);
      else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="ll-card p-5 space-y-4 lg:sticky lg:top-6">
      <h2 className="font-medium">Edit job</h2>

      <div>
        <label className="ll-label">Title</label>
        <input name="title" defaultValue={job.title} required className="ll-input" />
      </div>
      <div>
        <label className="ll-label">Type</label>
        <select name="type" defaultValue={job.type} className="ll-input">
          <option value="EDITORIAL">Editorial</option>
          <option value="CAMPAIGN">Campaign</option>
          <option value="RUNWAY">Runway</option>
          <option value="FITTING">Fitting</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="EVENT">Event</option>
          <option value="TEST">Test</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Start</label>
          <input type="date" name="startDate" defaultValue={job.startDate} required className="ll-input" />
        </div>
        <div>
          <label className="ll-label">End</label>
          <input type="date" name="endDate" defaultValue={job.endDate} required className="ll-input" />
        </div>
      </div>
      <div>
        <label className="ll-label">Location</label>
        <input name="location" defaultValue={job.location ?? ""} className="ll-input" />
      </div>
      <div>
        <label className="ll-label">City</label>
        <input name="locationCity" defaultValue={job.locationCity ?? ""} className="ll-input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Default rate</label>
          <input
            type="number"
            name="defaultRate"
            defaultValue={job.defaultRate ?? ""}
            step="0.01"
            min={0}
            className="ll-input"
          />
        </div>
        <div>
          <label className="ll-label">Rate type</label>
          <select name="rateType" defaultValue={job.rateType} className="ll-input">
            <option value="DAY">Per day</option>
            <option value="FLAT">Flat</option>
            <option value="HOURLY">Hourly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="ll-label">Currency</label>
        <input name="currency" defaultValue={job.currency} maxLength={3} className="ll-input uppercase" />
      </div>
      <div>
        <label className="ll-label">Brief</label>
        <textarea name="brief" defaultValue={job.brief ?? ""} rows={5} className="ll-input" />
      </div>

      <div className="pt-2 border-t border-paper-border">
        <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-2">Usage rights</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ll-label">Territory</label>
            <input
              name="usageTerritory"
              defaultValue={job.usageTerritory ?? ""}
              placeholder="FR, EU, Worldwide"
              className="ll-input"
            />
          </div>
          <div>
            <label className="ll-label">Duration</label>
            <input
              name="usageDuration"
              defaultValue={job.usageDuration ?? ""}
              placeholder="6 months, 1 year"
              className="ll-input"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="ll-label">Media <span className="text-ink-subtle normal-case">(comma-separated)</span></label>
          <input
            name="usageMedia"
            defaultValue={(job.usageMedia ?? []).join(", ")}
            placeholder="Print, Digital, OOH, Social"
            className="ll-input"
          />
        </div>
        <div className="mt-3">
          <label className="ll-label">Expiry</label>
          <input
            type="date"
            name="usageExpiresAt"
            defaultValue={job.usageExpiresAt ?? ""}
            className="ll-input"
          />
        </div>
      </div>

      <div>
        <label className="ll-label">Exclusivity category <span className="text-ink-subtle normal-case">(optional)</span></label>
        <input
          name="exclusivityCategory"
          defaultValue={job.exclusivityCategory ?? ""}
          placeholder='"Perfume / LVMH", "Denim"'
          className="ll-input"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-board-confirmed">Saved.</p>}

      <button type="submit" disabled={pending} className="ll-btn-primary w-full">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
