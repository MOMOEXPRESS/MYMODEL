"use client";

import { useState, useTransition } from "react";
import { createInvoiceFromJob } from "../actions";

type JobOpt = {
  id: string;
  title: string;
  contact: { name: string; company: string | null; email: string | null } | null;
};

export function NewInvoiceForm({
  jobs,
  preselectedJobId,
}: {
  jobs: JobOpt[];
  preselectedJobId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState(preselectedJobId);

  const selected = jobs.find((j) => j.id === jobId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createInvoiceFromJob(fd);
      if (res && !res.ok) setError(res.error);
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="ll-card p-6 space-y-4">
      <div>
        <label className="ll-label">Source</label>
        <select
          name="jobId"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          className="ll-input"
        >
          <option value="">Standalone invoice (no job)</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <p className="text-xs text-ink-subtle mt-1">
          When a job is picked, all confirmed models get line items with their rates.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Client name</label>
          <input
            name="clientName"
            defaultValue={selected?.contact?.name ?? ""}
            required
            className="ll-input"
            key={jobId}
          />
        </div>
        <div>
          <label className="ll-label">Company</label>
          <input
            name="clientCompany"
            defaultValue={selected?.contact?.company ?? ""}
            className="ll-input"
            key={jobId + "c"}
          />
        </div>
      </div>

      <div>
        <label className="ll-label">Client address</label>
        <textarea name="clientAddress" rows={2} className="ll-input" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Client VAT / TVA</label>
          <input name="clientVatNumber" className="ll-input" />
        </div>
        <div>
          <label className="ll-label">Tax rate %</label>
          <input type="number" step="0.1" name="taxRate" defaultValue={20} className="ll-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ll-label">Issued</label>
          <input type="date" defaultValue={today} disabled className="ll-input" />
        </div>
        <div>
          <label className="ll-label">Due</label>
          <input type="date" name="dueAt" defaultValue={due} className="ll-input" />
        </div>
      </div>

      <div>
        <label className="ll-label">Notes</label>
        <textarea name="notes" rows={3} placeholder="Payment terms, reference numbers, etc." className="ll-input" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end">
        <button type="submit" disabled={pending} className="ll-btn-primary">
          {pending ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </form>
  );
}
