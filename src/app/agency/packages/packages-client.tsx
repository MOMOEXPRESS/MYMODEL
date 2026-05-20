"use client";

import { useMemo, useState } from "react";
import { Division } from "@prisma/client";
import { Check, Copy, Link2, Mail, Trash2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import {
  createTalentPackage,
  deleteTalentPackage,
  emailTalentPackage,
  revokeTalentPackage,
} from "./actions";

type RosterRow = { userId: string; displayName: string; division: Division };

type PackageRow = {
  id: string;
  title: string;
  url: string;
  modelCount: number;
  viewCount: number;
  lastViewedAt: string | null;
  lastEmailedAt: string | null;
  createdAt: string;
};

export function PackagesClient({
  roster,
  packages: initial,
}: {
  roster: RosterRow[];
  packages: PackageRow[];
}) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packages, setPackages] = useState(initial);
  const [emailPkgId, setEmailPkgId] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return roster;
    return roster.filter((r) => r.displayName.toLowerCase().includes(needle));
  }, [roster, q]);

  function toggle(id: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function create() {
    if (!title.trim() || picked.size === 0) return;
    setPending(true);
    setError(null);
    try {
      const res = await createTalentPackage({
        title: title.trim(),
        note: note.trim() || null,
        modelIds: Array.from(picked),
        password: password.trim() || null,
      });
      if (!res.ok) throw new Error(res.error);
      setPackages((prev) => [
        {
          id: res.packageId,
          title: title.trim(),
          url: res.url,
          modelCount: picked.size,
          viewCount: 0,
          lastViewedAt: null,
          lastEmailedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitle("");
      setNote("");
      setPassword("");
      setPicked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function copyUrl(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function sendEmail() {
    if (!emailPkgId || !emailTo.trim()) return;
    setPending(true);
    setError(null);
    try {
      const recipients = emailTo
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await emailTalentPackage({
        packageId: emailPkgId,
        recipients,
        message: emailMsg.trim() || null,
      });
      if (!res.ok) throw new Error(res.error);
      setEmailPkgId(null);
      setEmailTo("");
      setEmailMsg("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <section className="ll-card p-5 space-y-4">
        <h2 className="text-sm font-medium">New package</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Package title (e.g. SS26 Womenswear)"
          className="ll-input text-sm w-full"
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the client (optional)"
          rows={2}
          className="ll-input text-sm w-full resize-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Optional link password"
          className="ll-input text-sm w-full"
          type="password"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search roster"
          className="ll-input text-sm w-full"
        />
        <ul className="max-h-64 overflow-y-auto divide-y divide-paper-border">
          {filtered.map((r) => (
            <li key={r.userId}>
              <button
                type="button"
                onClick={() => toggle(r.userId)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2 text-left text-sm hover:bg-paper-muted/60",
                  picked.has(r.userId) && "bg-paper-muted",
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded border flex items-center justify-center",
                    picked.has(r.userId) ? "bg-ink text-paper border-ink" : "border-paper-border",
                  )}
                >
                  {picked.has(r.userId) ? <Check size={12} /> : null}
                </span>
                <span className="font-medium">{r.displayName}</span>
                <span className="text-xs text-ink-muted ml-auto">{r.division}</span>
              </button>
            </li>
          ))}
        </ul>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="button"
          disabled={pending || !title.trim() || picked.size === 0}
          onClick={create}
          className="ll-btn-primary w-full"
        >
          {pending ? "Creating…" : `Create link · ${picked.size} model(s)`}
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium px-1">Active packages</h2>
        {packages.length === 0 ? (
          <p className="text-sm text-ink-muted ll-card p-6">No packages yet.</p>
        ) : (
          packages.map((p) => (
            <div key={p.id} className="ll-card p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {p.modelCount} models · {p.viewCount} view{p.viewCount === 1 ? "" : "s"}
                    {p.lastViewedAt
                      ? ` · last ${new Date(p.lastViewedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <Link2 size={16} className="text-ink-subtle shrink-0" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="ll-btn-secondary text-xs"
                  onClick={() => copyUrl(p.url, p.id)}
                >
                  {copied === p.id ? <Check size={12} /> : <Copy size={12} />}
                  {copied === p.id ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  className="ll-btn-secondary text-xs"
                  onClick={() => setEmailPkgId(p.id)}
                >
                  <Mail size={12} /> Email
                </button>
                <form
                  action={async (fd) => {
                    await revokeTalentPackage(fd);
                    setPackages((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                >
                  <input type="hidden" name="packageId" value={p.id} />
                  <button type="submit" className="ll-btn-secondary text-xs">
                    Revoke
                  </button>
                </form>
                <form
                  action={async (fd) => {
                    await deleteTalentPackage(fd);
                    setPackages((prev) => prev.filter((x) => x.id !== p.id));
                  }}
                >
                  <input type="hidden" name="packageId" value={p.id} />
                  <button type="submit" className="ll-btn-secondary text-xs text-red-700">
                    <Trash2 size={12} />
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      {emailPkgId ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="ll-card p-6 w-full max-w-md space-y-3">
            <h3 className="font-medium">Email package link</h3>
            <textarea
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="client@brand.com, buyer@…"
              rows={2}
              className="ll-input text-sm w-full"
            />
            <textarea
              value={emailMsg}
              onChange={(e) => setEmailMsg(e.target.value)}
              placeholder="Short message (optional)"
              rows={2}
              className="ll-input text-sm w-full"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="ll-btn-secondary" onClick={() => setEmailPkgId(null)}>
                Cancel
              </button>
              <button type="button" className="ll-btn-primary" disabled={pending} onClick={sendEmail}>
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}