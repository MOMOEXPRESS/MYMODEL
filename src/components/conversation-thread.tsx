"use client";

// Minimal 1:1 chat UI. Polls every 4s for new messages (good enough for
// Sprint 5; real SSE is a Tier 2 upgrade).

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn, initials } from "@/lib/utils";

type Msg = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  senderName: string;
  senderRole: "AGENCY_STAFF" | "MODEL" | "LUXLANE_ADMIN";
};

export function ConversationThread({
  conversationId,
  meUserId,
  counterpartName,
}: {
  conversationId: string;
  meUserId: string;
  counterpartName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const r = await fetch(`/api/conversations/${conversationId}/messages`, { signal });
        if (!r.ok) return;
        const json = (await r.json()) as { messages: Msg[] };
        setMessages(json.messages);
      } catch {
        /* aborted */
      }
    },
    [conversationId],
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchMessages(ac.signal);
    const t = setInterval(() => fetchMessages(), 4000);
    return () => {
      ac.abort();
      clearInterval(t);
    };
  }, [fetchMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSending(false);
    if (!res.ok) {
      setError("Couldn't send");
      return;
    }
    const json = (await res.json()) as { message: Msg };
    setMessages((m) => [...m, json.message]);
    setDraft("");
  }

  return (
    <div className="flex flex-col h-[min(calc(100vh-220px),700px)] ll-card">
      <header className="px-4 py-3 border-b border-paper-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
          {initials(counterpartName)}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm">{counterpartName}</div>
          <div className="text-[11px] text-ink-subtle">Direct message</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-ink-muted py-12">
            No messages yet. Say hi.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderUserId === meUserId;
          return (
            <div
              key={m.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div className={cn("max-w-[75%]", mine && "text-right")}>
                {!mine && (
                  <div className="text-[11px] text-ink-subtle mb-0.5">{m.senderName}</div>
                )}
                <div
                  className={cn(
                    "inline-block rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                    mine ? "bg-ink text-paper" : "bg-paper border border-paper-border",
                  )}
                >
                  {m.body}
                </div>
                <div className="text-[10px] text-ink-subtle mt-1">
                  {timeLabel(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="border-t border-paper-border p-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="ll-input flex-1"
          disabled={sending}
        />
        <button type="submit" disabled={sending || draft.trim().length === 0} className="ll-btn-primary">
          <Send size={14} /> Send
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    </div>
  );
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
