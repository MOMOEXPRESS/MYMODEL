import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";

export default async function EventsPage() {
  const user = await requirePlatformUser();

  const [hosted, memberOf] = await Promise.all([
    prisma.groupEvent.findMany({
      where: { hostUserId: user.id },
      orderBy: { startDate: "desc" },
      include: { _count: { select: { members: true } } },
    }),
    prisma.groupEventMember.findMany({
      where: { userId: user.id, role: { not: "HOST" } },
      include: { event: { include: { host: { select: { displayName: true } } } } },
    }),
  ]);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Group events"
        subtitle="Collaborative shoots, castings, and productions with your network."
        actions={
          <Link href="/events/new" className="ll-btn-primary">
            <Plus size={16} /> New event
          </Link>
        }
      />

      <section className="mt-8">
        <h2 className="text-sm font-semibold mb-3">You host</h2>
        {hosted.length === 0 ? (
          <p className="text-sm text-ink-muted">Create an event to invite your network.</p>
        ) : (
          <ul className="space-y-2">
            {hosted.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="ll-card-interactive block p-4">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    {e.type.toLowerCase()} · {e._count.members} members · {e.status.toLowerCase()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {memberOf.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold mb-3">You&apos;re part of</h2>
          <ul className="space-y-2">
            {memberOf.map((m) => (
              <li key={m.id}>
                <Link href={`/events/${m.eventId}`} className="ll-card-interactive block p-4">
                  <p className="font-medium">{m.event.title}</p>
                  <p className="text-xs text-ink-muted">
                    Host: {m.event.host.displayName} · {m.status.toLowerCase()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
