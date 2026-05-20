import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePlatformUser } from "@/lib/auth-guards";
import { roleLabel } from "@/lib/network";
import { sendConnectionRequest, respondConnection } from "@/app/network/actions";
import { PageHeader } from "@/components/page-header";

export default async function NetworkPage() {
  const user = await requirePlatformUser();

  const [connections, pendingIn, pendingOut, discover] = await Promise.all([
    prisma.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ fromUserId: user.id }, { toUserId: user.id }],
      },
      include: {
        fromUser: { select: { id: true, displayName: true, role: true } },
        toUser: { select: { id: true, displayName: true, role: true } },
      },
    }),
    prisma.connection.findMany({
      where: { toUserId: user.id, status: "PENDING" },
      include: { fromUser: { select: { id: true, displayName: true, role: true } } },
    }),
    prisma.connection.findMany({
      where: { fromUserId: user.id, status: "PENDING" },
      include: { toUser: { select: { id: true, displayName: true, role: true } } },
    }),
    prisma.user.findMany({
      where: {
        id: { not: user.id },
        suspended: false,
        role: { in: ["MODEL", "CLIENT", "CREATIVE", "AGENCY_STAFF", "MEMBER"] },
      },
      take: 24,
      orderBy: { createdAt: "desc" },
      select: { id: true, displayName: true, role: true, email: true },
    }),
  ]);

  const connectedIds = new Set(
    connections.flatMap((c) => [c.fromUserId, c.toUserId]).filter((id) => id !== user.id),
  );

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Network"
        subtitle="Connect with models, clients, creatives, and agencies on LuxLane."
      />

      {pendingIn.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold mb-3">Requests for you</h2>
          <ul className="space-y-2">
            {pendingIn.map((c) => (
              <li key={c.id} className="ll-card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{c.fromUser.displayName}</p>
                  <p className="text-xs text-ink-muted">{roleLabel(c.fromUser.role)}</p>
                </div>
                <div className="flex gap-2">
                  <form action={respondConnection}>
                    <input type="hidden" name="connectionId" value={c.id} />
                    <input type="hidden" name="accept" value="1" />
                    <button type="submit" className="ll-btn-primary text-xs">
                      Accept
                    </button>
                  </form>
                  <form action={respondConnection}>
                    <input type="hidden" name="connectionId" value={c.id} />
                    <input type="hidden" name="accept" value="0" />
                    <button type="submit" className="ll-btn-ghost text-xs">
                      Decline
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold mb-3">Your connections</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-ink-muted">No connections yet. Discover people below.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {connections.map((c) => {
              const other = c.fromUserId === user.id ? c.toUser : c.fromUser;
              return (
                <li key={c.id} className="ll-card p-4">
                  <p className="font-medium">{other.displayName}</p>
                  <p className="text-xs text-ink-muted">{roleLabel(other.role)}</p>
                  <Link href="/events" className="text-xs text-accent mt-2 inline-block">
                    Invite to an event →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pendingOut.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold mb-3">Pending sent</h2>
          <ul className="text-sm text-ink-muted space-y-1">
            {pendingOut.map((c) => (
              <li key={c.id}>{c.toUser.displayName} — waiting</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold mb-3">Discover</h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {discover
            .filter((u) => !connectedIds.has(u.id))
            .map((u) => (
              <li key={u.id} className="ll-card p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{u.displayName}</p>
                  <p className="text-xs text-ink-muted">{roleLabel(u.role)}</p>
                </div>
                <form action={sendConnectionRequest}>
                  <input type="hidden" name="toUserId" value={u.id} />
                  <button type="submit" className="ll-btn-secondary text-xs">
                    Connect
                  </button>
                </form>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
