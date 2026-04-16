import { History } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { initials } from "@/lib/utils";

export default async function ActivityPage() {
  const user = await requireAgencyStaff();

  const events = await prisma.auditEvent.findMany({
    where: { agencyId: user.agencyId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Activity log"
        subtitle="Everything that's happened in the agency — who did what, when."
      />
      <div className="px-8 pb-12">
        {events.length === 0 ? (
          <EmptyState
            icon={<History size={20} />}
            title="Nothing logged yet"
            body="Every job, assignment, invoice, and contract change will appear here as soon as someone acts."
          />
        ) : (
          <ul className="ll-card overflow-hidden divide-y divide-paper-border">
            {events.map((e) => (
              <li key={e.id} className="px-5 py-3 flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center shrink-0">
                  {initials(e.actorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-medium">{e.actorName}</span>
                    <span className="text-ink-muted"> · {e.summary}</span>
                  </div>
                  <div className="text-[11px] text-ink-subtle mt-0.5">
                    {e.action} · {e.entityType} ·{" "}
                    {e.createdAt.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
