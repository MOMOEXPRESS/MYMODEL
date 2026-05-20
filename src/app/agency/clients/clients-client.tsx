"use client";

import { JobStatus } from "@prisma/client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Plus, Link2, Copy, RotateCcw, ShieldOff, Trash2, Mail, Building2 } from "lucide-react";
import { CLIENT_SUBTYPE_OPTIONS } from "@/lib/client-subtypes";
import {
  upsertClient,
  enablePortal,
  revokePortal,
  rotatePortalToken,
  deleteClient,
} from "./actions";

type ClientRow = {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  subtype: string;
  portalEnabled: boolean;
  portalToken: string | null;
  portalTokenIssuedAt: string | null;
  platformUserId: string | null;
  jobs: { id: string; title: string; status: JobStatus; startDate: string; endDate: string }[];
};

export function ClientsClient({ clients }: { clients: ClientRow[] }) {
  const [editing, setEditing] = useState<ClientRow | "new" | null>(null);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">
          {clients.length} client{clients.length === 1 ? "" : "s"}
        </span>
        <button onClick={() => setEditing("new")} className="ll-btn-primary">
          <Plus size={14} /> New client
        </button>
      </div>

      {editing && (
        <ClientForm
          client={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {clients.length === 0 ? (
        <div className="ll-card p-10 text-center">
          <p className="text-sm text-ink-muted">
            No clients yet. Add a brand or casting director to share a portal link with them.
          </p>
        </div>
      ) : (
        <ul className="grid md:grid-cols-2 gap-4">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onEdit={() => setEditing(c)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientCard({ client, onEdit }: { client: ClientRow; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const portalUrl =
    typeof window !== "undefined" && client.portalToken
      ? `${window.location.origin}/client/${client.portalToken}`
      : null;

  function enable() {
    const fd = new FormData();
    fd.set("clientId", client.id);
    startTransition(async () => {
      await enablePortal(fd);
    });
  }

  function rotate() {
    if (!confirm("Rotating invalidates the old link. Continue?")) return;
    const fd = new FormData();
    fd.set("clientId", client.id);
    startTransition(async () => {
      await rotatePortalToken(fd);
    });
  }

  function revoke() {
    if (!confirm("Revoke portal access? The old link stops working.")) return;
    const fd = new FormData();
    fd.set("clientId", client.id);
    startTransition(async () => {
      await revokePortal(fd);
    });
  }

  function remove() {
    if (!confirm(`Delete ${client.name}?`)) return;
    const fd = new FormData();
    fd.set("clientId", client.id);
    startTransition(async () => {
      await deleteClient(fd);
    });
  }

  function copyLink() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="ll-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/agency/clients/${client.id}`} className="font-medium truncate hover:text-accent">
            {client.name}
          </Link>
          {client.platformUserId && (
            <span className="ml-2 text-[10px] text-emerald-500/90">Linked</span>
          )}
          {client.companyName && (
            <div className="mt-0.5 text-xs text-ink-muted inline-flex items-center gap-1">
              <Building2 size={11} /> {client.companyName}
            </div>
          )}
          <div className="mt-0.5 text-xs text-ink-muted inline-flex items-center gap-1">
            <Mail size={11} /> {client.email}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="ll-btn-ghost text-xs">Edit</button>
          <button
            onClick={remove}
            disabled={pending}
            className="ll-btn-ghost text-xs text-ink-subtle hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-paper-border">
        {client.portalEnabled && client.portalToken ? (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1 text-xs text-board-confirmed">
              <Link2 size={12} /> Portal active
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-[10px] bg-paper px-2 py-1.5 rounded border border-paper-border">
                {portalUrl ?? "…"}
              </code>
              <button
                onClick={copyLink}
                disabled={!portalUrl}
                className="ll-btn-secondary text-xs"
              >
                <Copy size={11} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={rotate}
                disabled={pending}
                className="ll-btn-ghost"
                title="Issue a new token"
              >
                <RotateCcw size={11} /> Rotate
              </button>
              <button
                onClick={revoke}
                disabled={pending}
                className="ll-btn-ghost"
              >
                <ShieldOff size={11} /> Revoke
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={enable}
            disabled={pending}
            className="ll-btn-primary text-xs w-full"
          >
            <Link2 size={12} /> Enable portal
          </button>
        )}
      </div>

      {client.jobs.length > 0 && (
        <div className="mt-4 pt-3 border-t border-paper-border">
          <div className="text-[10px] uppercase tracking-wider text-ink-subtle mb-2">Recent jobs</div>
          <ul className="space-y-1 text-xs">
            {client.jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/agency/jobs/${j.id}`} className="hover:underline">
                  {j.title}
                </Link>{" "}
                <span className="text-ink-subtle">
                  · {j.startDate} · {j.status.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function ClientForm({ client, onClose }: { client: ClientRow | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (client) fd.set("clientId", client.id);
    setError(null);
    startTransition(async () => {
      const res = await upsertClient(fd);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <form onSubmit={onSubmit} className="ll-card p-5 grid sm:grid-cols-2 gap-3">
      <h2 className="sm:col-span-2 font-medium">
        {client ? `Edit ${client.name}` : "New client"}
      </h2>
      <div>
        <label className="ll-label">Name</label>
        <input name="name" defaultValue={client?.name ?? ""} required className="ll-input" />
      </div>
      <div>
        <label className="ll-label">Company</label>
        <input
          name="companyName"
          defaultValue={client?.companyName ?? ""}
          className="ll-input"
        />
      </div>
      <div>
        <label className="ll-label">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={client?.email ?? ""}
          required
          className="ll-input"
        />
      </div>
      <div>
        <label className="ll-label">Phone</label>
        <input name="phone" defaultValue={client?.phone ?? ""} className="ll-input" />
      </div>
      <div className="sm:col-span-2">
        <label className="ll-label">Client type</label>
        <select name="subtype" defaultValue={client?.subtype ?? "BRAND"} className="ll-input">
          {CLIENT_SUBTYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="sm:col-span-2 text-xs text-red-500">{error}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
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
