"use client";

import { RoomFileType } from "@prisma/client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Send,
  CalendarClock,
  FolderOpen,
} from "lucide-react";
import {
  uploadRoomFile,
  deleteRoomFile,
  addScheduleItem,
  deleteScheduleItem,
  sendRoomMessage,
  listRoomMessages,
} from "./room-actions";
import { cn, initials } from "@/lib/utils";

type FileRow = {
  id: string;
  name: string;
  type: RoomFileType;
  url: string;
  uploadedByName: string;
  uploadedAt: string;
};

type ScheduleRow = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  notes: string | null;
};

type ChatMsg = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  senderName: string;
  senderRole: "AGENCY_STAFF" | "MODEL" | "LUXLANE_ADMIN";
};

export function JobRoomSection({
  jobId,
  meUserId,
  files: initialFiles,
  schedule: initialSchedule,
  readOnly = false,
}: {
  jobId: string;
  meUserId: string;
  files: FileRow[];
  schedule: ScheduleRow[];
  readOnly?: boolean;
}) {
  return (
    <section className="ll-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen size={15} className="text-ink-muted" />
        <h2 className="font-medium">Job room</h2>
        <span className="text-xs text-ink-subtle">
          Shared with confirmed models
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <FilesBlock jobId={jobId} files={initialFiles} readOnly={readOnly} />
        <ScheduleBlock jobId={jobId} schedule={initialSchedule} readOnly={readOnly} />
      </div>

      <div className="mt-6">
        <ChatBlock jobId={jobId} meUserId={meUserId} />
      </div>
    </section>
  );
}

function FilesBlock({
  jobId,
  files,
  readOnly,
}: {
  jobId: string;
  files: FileRow[];
  readOnly: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<RoomFileType>("CALLSHEET");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function pick() {
    inputRef.current?.click();
  }
  function onFile(f: File) {
    const fd = new FormData();
    fd.set("jobId", jobId);
    fd.set("type", type);
    fd.set("file", f);
    setError(null);
    startTransition(async () => {
      const res = await uploadRoomFile(fd);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Files</h3>
        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RoomFileType)}
              className="ll-input w-auto text-xs"
            >
              <option value="CALLSHEET">Call sheet</option>
              <option value="BRIEF">Brief</option>
              <option value="LOOKBOOK">Lookbook</option>
              <option value="CONTRACT">Contract</option>
              <option value="OTHER">Other</option>
            </select>
            <button onClick={pick} disabled={pending} className="ll-btn-secondary text-xs">
              <Plus size={13} /> Upload
            </button>
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onFile(f);
              }}
            />
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {files.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">
          Post the call sheet, the brief, the lookbook — the shoot crew gets it instantly.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-paper-border">
          {files.map((f) => (
            <FileRowView key={f.id} file={f} readOnly={readOnly} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRowView({ file, readOnly }: { file: FileRow; readOnly: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="py-2 flex items-center gap-3 text-sm">
      <div className="w-8 h-8 rounded-md bg-paper border border-paper-border flex items-center justify-center text-ink-muted shrink-0">
        <FileText size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="font-medium hover:underline underline-offset-4 truncate block"
        >
          {file.name}
        </a>
        <div className="text-[11px] text-ink-subtle mt-0.5">
          {file.type.toLowerCase()} · {file.uploadedByName} ·{" "}
          {new Date(file.uploadedAt).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="ll-btn-ghost p-1.5"
        title="Open"
      >
        <Download size={13} />
      </a>
      {!readOnly && (
        <form
          action={(fd) =>
            startTransition(async () => {
              fd.set("fileId", file.id);
              await deleteRoomFile(fd);
            })
          }
        >
          <button type="submit" disabled={pending} className="ll-btn-ghost p-1.5">
            <Trash2 size={13} />
          </button>
        </form>
      )}
    </li>
  );
}

function ScheduleBlock({
  jobId,
  schedule,
  readOnly,
}: {
  jobId: string;
  schedule: ScheduleRow[];
  readOnly: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium inline-flex items-center gap-1.5">
          <CalendarClock size={13} /> Schedule
        </h3>
        {!readOnly && !showForm && (
          <button onClick={() => setShowForm(true)} className="ll-btn-secondary text-xs">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {schedule.length === 0 && !showForm && (
        <p className="mt-3 text-sm text-ink-muted">Fitting, call time, wrap — they all live here.</p>
      )}

      <ul className="mt-3 divide-y divide-paper-border">
        {schedule.map((s) => (
          <ScheduleRowView key={s.id} item={s} readOnly={readOnly} />
        ))}
      </ul>

      {showForm && (
        <ScheduleForm jobId={jobId} onCancel={() => setShowForm(false)} onAdded={() => setShowForm(false)} />
      )}
    </div>
  );
}

function ScheduleRowView({ item, readOnly }: { item: ScheduleRow; readOnly: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <li className="py-2 flex items-start gap-3 text-sm">
      <div className="w-12 shrink-0 text-center">
        <div className="text-[10px] uppercase tracking-wider text-ink-subtle">
          {new Date(item.date).toLocaleDateString([], { month: "short", timeZone: "UTC" })}
        </div>
        <div className="font-serif text-lg leading-none">
          {new Date(item.date).getUTCDate()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{item.title}</div>
        <div className="text-[11px] text-ink-subtle mt-0.5 flex flex-wrap gap-x-2">
          {item.time && <span>{item.time}</span>}
          {item.location && <span>· {item.location}</span>}
        </div>
        {item.notes && <p className="text-xs text-ink-muted mt-1 whitespace-pre-wrap">{item.notes}</p>}
      </div>
      {!readOnly && (
        <form
          action={(fd) =>
            startTransition(async () => {
              fd.set("itemId", item.id);
              await deleteScheduleItem(fd);
            })
          }
        >
          <button type="submit" disabled={pending} className="ll-btn-ghost p-1.5">
            <Trash2 size={13} />
          </button>
        </form>
      )}
    </li>
  );
}

function ScheduleForm({
  jobId,
  onCancel,
  onAdded,
}: {
  jobId: string;
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
      const res = await addScheduleItem(fd);
      if (!res.ok) setError(res.error);
      else onAdded();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 border-t border-paper-border pt-3 space-y-2">
      <input name="title" required placeholder="Fitting" className="ll-input text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input name="date" type="date" required className="ll-input text-sm" />
        <input name="time" placeholder="14:00" className="ll-input text-sm" />
      </div>
      <input name="location" placeholder="Studio Palais Royal" className="ll-input text-sm" />
      <textarea name="notes" rows={2} placeholder="Notes" className="ll-input text-sm" />
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

function ChatBlock({ jobId, meUserId }: { jobId: string; meUserId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    const res = await listRoomMessages(jobId);
    if (res.ok) setMessages(res.messages);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const res = await sendRoomMessage({ jobId, body });
    setSending(false);
    if (res.ok) {
      setMessages((m) => [...m, res.message]);
      setDraft("");
    }
  }

  return (
    <div className="border-t border-paper-border pt-5">
      <h3 className="text-sm font-medium">Chat</h3>
      <div className="mt-2 h-72 overflow-auto rounded-lg border border-paper-border bg-paper p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-sm text-ink-muted text-center py-10">No messages yet.</div>
        ) : (
          messages.map((m) => {
            const mine = m.senderUserId === meUserId;
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <div className="w-6 h-6 rounded-full bg-accent-soft text-accent text-[10px] font-medium flex items-center justify-center shrink-0">
                    {initials(m.senderName)}
                  </div>
                )}
                <div className="max-w-[75%]">
                  {!mine && (
                    <div className="text-[10px] text-ink-subtle mb-0.5">{m.senderName}</div>
                  )}
                  <div
                    className={cn(
                      "inline-block rounded-xl px-3 py-1.5 text-sm whitespace-pre-wrap break-words",
                      mine ? "bg-ink text-paper" : "bg-paper-elevated border border-paper-border",
                    )}
                  >
                    {m.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-2 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the room…"
          className="ll-input flex-1 text-sm"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="ll-btn-primary">
          <Send size={13} /> Send
        </button>
      </form>
    </div>
  );
}
