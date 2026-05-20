import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/auth-guards";
import { applyToGroupEvent, inviteToGroupEvent, respondGroupEventInvite } from "@/app/events/actions";
import { roleLabel } from "@/lib/network";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await requirePlatformUser();
  const { eventId } = await params;

  const event = await prisma.groupEvent.findUnique({
    where: { id: eventId },
    include: {
      host: { select: { id: true, displayName: true, role: true } },
      linkedJob: { select: { id: true, title: true } },
      members: {
        include: { user: { select: { id: true, displayName: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!event) notFound();

  const isHost = event.hostUserId === user.id;
  const myMembership = event.members.find((m) => m.userId === user.id);

  const connections = isHost
    ? await prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ fromUserId: user.id }, { toUserId: user.id }],
        },
        include: {
          fromUser: { select: { id: true, displayName: true } },
          toUser: { select: { id: true, displayName: true } },
        },
      })
    : [];

  return (
    <div className="p-6 lg:p-8">
      <Link href="/events" className="text-sm text-ink-muted hover:text-ink">
        ← Events
      </Link>
      <header className="mt-4">
        <p className="ll-badge">{event.type.toLowerCase()}</p>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">{event.title}</h1>
        <p className="text-sm text-ink-muted mt-2">
          Host: {event.host.displayName} · {event.startDate.toISOString().slice(0, 10)}
          {event.city ? ` · ${event.city}` : ""}
        </p>
        {event.description && (
          <p className="mt-4 text-sm text-ink-muted leading-relaxed">{event.description}</p>
        )}
        {event.linkedJob && (
          <p className="mt-3 text-sm">
            Linked booking:{" "}
            <Link href={`/agency/bookings/${event.linkedJob.id}`} className="text-accent hover:underline">
              {event.linkedJob.title}
            </Link>
          </p>
        )}
      </header>

      {!isHost && !myMembership && event.status === "OPEN" && (
        <form action={applyToGroupEvent} className="mt-6 ll-card p-4">
          <input type="hidden" name="eventId" value={event.id} />
          <p className="text-sm text-ink-muted mb-3">Request to join this event.</p>
          <button type="submit" className="ll-btn-primary text-sm">
            Apply to join
          </button>
        </form>
      )}

      {myMembership?.status === "INVITED" && (
        <div className="mt-6 ll-card p-4 flex gap-2">
          <form action={respondGroupEventInvite}>
            <input type="hidden" name="memberId" value={myMembership.id} />
            <input type="hidden" name="accept" value="1" />
            <button type="submit" className="ll-btn-primary text-sm">
              Accept invite
            </button>
          </form>
          <form action={respondGroupEventInvite}>
            <input type="hidden" name="memberId" value={myMembership.id} />
            <input type="hidden" name="accept" value="0" />
            <button type="submit" className="ll-btn-ghost text-sm">
              Decline
            </button>
          </form>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold mb-3">Members</h2>
        <ul className="space-y-2">
          {event.members.map((m) => (
            <li key={m.id} className="ll-card p-3 flex justify-between text-sm">
              <span>
                {m.user.displayName}{" "}
                <span className="text-ink-subtle">
                  · {m.role.toLowerCase()} · {roleLabel(m.user.role)}
                </span>
              </span>
              <span className="text-ink-subtle">{m.status.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>

      {isHost && connections.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold mb-3">Invite connections</h2>
          <ul className="space-y-2">
            {connections.map((c) => {
              const other = c.fromUserId === user.id ? c.toUser : c.fromUser;
              if (event.members.some((m) => m.userId === other.id)) return null;
              return (
                <li key={c.id} className="ll-card p-3 flex items-center justify-between">
                  <span className="text-sm">{other.displayName}</span>
                  <form action={inviteToGroupEvent}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <input type="hidden" name="userId" value={other.id} />
                    <button type="submit" className="ll-btn-secondary text-xs">
                      Invite
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
