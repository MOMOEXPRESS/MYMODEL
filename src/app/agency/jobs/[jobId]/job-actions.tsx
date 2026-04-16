"use client";

import { JobStatus } from "@prisma/client";
import { useState, useTransition } from "react";
import { Trash2, Copy } from "lucide-react";
import { setJobStatus, deleteJob, duplicateJob } from "../actions";
import { cn } from "@/lib/utils";

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "OPEN", "CANCELLED"],
  IN_PROGRESS: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: ["OPEN"],
};

const LABEL: Record<JobStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export function JobActions({ jobId, status }: { jobId: string; status: JobStatus }) {
  const [pending, startTransition] = useTransition();

  function changeStatus(next: JobStatus) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("jobId", jobId);
      fd.set("status", next);
      await setJobStatus(fd);
    });
  }

  function destroy() {
    if (!confirm("Delete this job and its assignments? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("jobId", jobId);
    startTransition(async () => {
      await deleteJob(fd);
    });
  }

  const options = TRANSITIONS[status];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={cn(
          "text-xs px-2.5 py-1 rounded-md",
          status === "CONFIRMED" && "bg-board-confirmed/20 text-board-confirmed",
          status === "IN_PROGRESS" && "bg-board-onJob/20 text-board-onJob",
          status === "OPEN" && "bg-board-option2/40 text-ink",
          (status === "DRAFT" || status === "DONE" || status === "CANCELLED") &&
            "bg-paper-border/60 text-ink-muted",
        )}
      >
        {LABEL[status]}
      </span>

      {options.length > 0 && (
        <select
          disabled={pending}
          value=""
          onChange={(e) => {
            if (e.target.value) changeStatus(e.target.value as JobStatus);
            e.target.value = "";
          }}
          className="ll-input w-auto text-xs"
        >
          <option value="" disabled>
            Change status…
          </option>
          {options.map((s) => (
            <option key={s} value={s}>
              Mark {LABEL[s].toLowerCase()}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={() => {
          const fd = new FormData();
          fd.set("jobId", jobId);
          startTransition(async () => {
            await duplicateJob(fd);
          });
        }}
        disabled={pending}
        className="ll-btn-ghost text-xs"
        title="Duplicate this job (a week later)"
      >
        <Copy size={13} /> Duplicate
      </button>

      <button onClick={destroy} disabled={pending} className="ll-btn-ghost text-xs text-red-600">
        <Trash2 size={13} /> Delete
      </button>
    </div>
  );
}
