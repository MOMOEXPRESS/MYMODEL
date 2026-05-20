"use client";

import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

export function NotificationBell({ side = "left" }: { side?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);

  async function load() {
    const r = await fetch("/api/notifications");
    if (!r.ok) return;
    const j = (await r.json()) as { notifications: Notif[]; unreadCount: number };
    setItems(j.notifications);
    setUnread(j.unreadCount);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    });
    load();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ll-btn-ghost p-1.5 relative"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-accent" />
        )}
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 w-80 max-h-96 overflow-auto ll-card shadow-xl p-2",
            side === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-paper-border mb-1">
            <span className="text-xs font-medium">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-ink-muted hover:text-ink">
                <Check size={11} className="inline" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">You&apos;re all caught up.</p>
          ) : (
            <ul className="space-y-0.5">
              {items.map((n) => (
                <li key={n.id}>
                  <NotifItem n={n} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NotifItem({ n }: { n: Notif }) {
  const p = n.payload as Record<string, unknown>;
  const preview = (p.preview as string) ?? (p.fileName as string) ?? "";
  const sender = (p.senderName as string) ?? "";
  const conversationId = p.conversationId as string | undefined;
  const jobId = p.jobId as string | undefined;

  const { title, href } = (() => {
    switch (n.type) {
      case "MESSAGE":
        return {
          title: `${sender}: ${preview}`,
          href: conversationId ? `#` : "#",
        };
      case "BROADCAST":
        return {
          title: `Broadcast from ${sender}: ${preview}`,
          href: "/m",
        };
      case "CALLSHEET":
        return {
          title: `Call sheet posted: ${preview}`,
          href: jobId ? `/m/jobs/${jobId}` : "#",
        };
      case "CLIENT_APPROVED_MODEL":
        return {
          title: `Client approved ${(p.modelName as string) ?? "model"} on ${(p.jobTitle as string) ?? "job"}`,
          href: jobId ? `/agency/bookings/${jobId}` : "/agency/bookings",
        };
      case "CLIENT_FLAGGED_MODEL":
        return {
          title: `Client flagged ${(p.modelName as string) ?? "model"}: ${(p.note as string) ?? "see job"}`,
          href: jobId ? `/agency/bookings/${jobId}` : "/agency/bookings",
        };
      case "CLIENT_BRIEF_SUBMITTED":
        return {
          title: `New brief: ${(p.title as string) ?? "Untitled"}`,
          href: "/agency/workbench",
        };
      case "STALE_OPTION":
        return {
          title: `Stale hold: ${(p.modelName as string) ?? "model"} on ${(p.jobTitle as string) ?? "job"}`,
          href: jobId ? `/agency/bookings/${jobId}` : "/agency/schedule",
        };
      default:
        return { title: n.type.replace(/_/g, " ").toLowerCase(), href: "#" };
    }
  })();

  const time = new Date(n.createdAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      href={href}
      className={cn(
        "block px-2 py-1.5 rounded hover:bg-paper text-sm",
        !n.read && "bg-accent-soft/30",
      )}
    >
      <div className="truncate">{title}</div>
      <div className="text-[10px] text-ink-subtle mt-0.5">{time}</div>
    </Link>
  );
}
