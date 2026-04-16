"use client";

import { ContractKind, ContractStatus } from "@prisma/client";
import { Plus, FilePenLine, Send, Trash2, Download, Check, Copy } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createContract, deleteContract, sendForSignature } from "./actions";
import { cn } from "@/lib/utils";

type ContractRow = {
  id: string;
  title: string;
  kind: ContractKind;
  status: ContractStatus;
  modelName: string | null;
  jobTitle: string | null;
  fileUrl: string | null;
  sigToken: string | null;
  sentAt: string | null;
  signedAt: string | null;
  signedName: string | null;
};

type ModelOpt = { userId: string; name: string };
type JobOpt = { id: string; title: string };

export function ContractsClient({
  models,
  jobs,
  contracts,
}: {
  models: ModelOpt[];
  jobs: JobOpt[];
  contracts: ContractRow[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <section className="ll-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">New contract</h2>
            <p className="text-xs text-ink-subtle mt-0.5">
              Upload the PDF — we&apos;ll generate a signing link. No YouSign keys
              needed in dev; plug YouSign in later for eIDAS-qualified signatures.
            </p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="ll-btn-secondary text-xs">
              <Plus size={14} /> Add
            </button>
          )}
        </div>
        {showForm && (
          <NewContractForm
            models={models}
            jobs={jobs}
            onClose={() => setShowForm(false)}
          />
        )}
      </section>

      {contracts.length > 0 && (
        <section>
          <h2 className="font-medium mb-3">All contracts</h2>
          <ul className="ll-card divide-y divide-paper-border overflow-hidden">
            {contracts.map((c) => (
              <ContractRowView key={c.id} contract={c} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ContractRowView({ contract: c }: { contract: ContractRow }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function sendNow() {
    const fd = new FormData();
    fd.set("contractId", c.id);
    startTransition(async () => {
      await sendForSignature(fd);
    });
  }
  function destroy() {
    if (!confirm(`Delete "${c.title}"?`)) return;
    const fd = new FormData();
    fd.set("contractId", c.id);
    startTransition(async () => {
      await deleteContract(fd);
    });
  }
  async function copySignLink() {
    if (!c.sigToken) return;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    await navigator.clipboard.writeText(`${origin}/sign/${c.sigToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="px-5 py-3 flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-md bg-paper border border-paper-border flex items-center justify-center text-ink-muted shrink-0">
        <FilePenLine size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{c.title}</div>
        <div className="text-xs text-ink-muted mt-0.5">
          {c.kind.replace("_", " ").toLowerCase()}
          {c.modelName && ` · ${c.modelName}`}
          {c.jobTitle && ` · ${c.jobTitle}`}
          {c.signedAt &&
            ` · signed by ${c.signedName ?? "model"} on ${new Date(c.signedAt).toLocaleDateString()}`}
        </div>
      </div>
      <StatusBadge status={c.status} />
      {c.fileUrl && (
        <a href={c.fileUrl} target="_blank" rel="noreferrer" className="ll-btn-ghost p-1.5" title="Download">
          <Download size={13} />
        </a>
      )}
      {c.status === "DRAFT" && c.fileUrl && (
        <button onClick={sendNow} disabled={pending} className="ll-btn-secondary text-xs">
          <Send size={13} /> Send
        </button>
      )}
      {c.status === "SENT" && c.sigToken && (
        <button onClick={copySignLink} className="ll-btn-secondary text-xs">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      )}
      <button onClick={destroy} disabled={pending} className="ll-btn-ghost p-1.5 text-red-600">
        <Trash2 size={13} />
      </button>
    </li>
  );
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const map: Record<ContractStatus, string> = {
    DRAFT: "bg-paper-border/60 text-ink-muted",
    SENT: "bg-board-option2/50 text-ink",
    SIGNED: "bg-board-confirmed/20 text-board-confirmed",
    DECLINED: "bg-red-50 text-red-600",
    CANCELLED: "bg-paper-border/40 text-ink-subtle line-through",
  };
  return (
    <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md", map[status])}>
      {status.toLowerCase()}
    </span>
  );
}

function NewContractForm({
  models,
  jobs,
  onClose,
}: {
  models: ModelOpt[];
  jobs: JobOpt[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await createContract(fd);
      if (!res.ok) setError(res.error);
      else {
        formRef.current?.reset();
        onClose();
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-4 border-t border-paper-border pt-4 space-y-3">
      <input name="title" required placeholder='"2026 representation agreement"' className="ll-input text-sm" />
      <div className="grid sm:grid-cols-3 gap-3">
        <select name="kind" defaultValue="MODEL_AGENCY" className="ll-input text-sm">
          <option value="MODEL_AGENCY">Model ↔ Agency</option>
          <option value="BOOKING">Booking</option>
          <option value="CLIENT">Client</option>
          <option value="OTHER">Other</option>
        </select>
        <select name="modelId" defaultValue="" className="ll-input text-sm">
          <option value="">— Model (optional) —</option>
          {models.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="jobId" defaultValue="" className="ll-input text-sm">
          <option value="">— Job (optional) —</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>
      <input name="file" type="file" accept="application/pdf,image/*" className="ll-input text-sm" />
      <textarea name="notes" rows={2} placeholder="Internal notes (not sent to signer)" className="ll-input text-sm" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="ll-btn-ghost text-sm">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="ll-btn-primary text-sm">
          {pending ? "Saving…" : "Save draft"}
        </button>
      </div>
    </form>
  );
}
