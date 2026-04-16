import Link from "next/link";
import { MessageSquare, Radio } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { listAgencyConversations } from "@/lib/conversations";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { initials } from "@/lib/utils";

export default async function MessagesPage() {
  const user = await requireAgencyStaff();
  const convos = await listAgencyConversations({
    agencyId: user.agencyId,
    staffUserId: user.id,
  });

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="1:1 threads with models and broadcasts."
        actions={
          <Link href="/agency/broadcasts" className="ll-btn-secondary">
            <Radio size={14} /> Broadcasts
          </Link>
        }
      />
      <div className="px-8 py-8">
        {convos.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={20} />}
            title="No conversations yet"
            body="Open any model's profile and click Message to start a thread."
          />
        ) : (
          <ul className="ll-card overflow-hidden divide-y divide-paper-border">
            {convos.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/agency/messages/${c.modelUserId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-paper/50"
                >
                  <div className="w-9 h-9 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
                    {initials(c.modelName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-sm flex items-center gap-2">
                        {c.modelName}
                        {c.unreadForMe && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </span>
                      {c.lastMessage && (
                        <span className="text-[11px] text-ink-subtle shrink-0">
                          {timeAgo(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-muted truncate mt-0.5">
                      {c.lastMessage
                        ? `${c.lastMessage.senderName}: ${c.lastMessage.body}`
                        : "No messages yet"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
