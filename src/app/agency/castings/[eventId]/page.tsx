import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";

export default async function CastingBookings({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await requireAgencyStaff();
  const { eventId } = await params;
  const event = await prisma.castingEvent.findUnique({
    where: { id: eventId },
    include: {
      slots: { where: { bookedAt: { not: null } }, orderBy: { startAt: "asc" } },
    },
  });
  if (!event || event.agencyId !== user.agencyId) notFound();

  return (
    <div>
      <div className="px-8 pt-8">
        <Link
          href="/agency/castings"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> All castings
        </Link>
      </div>
      <header className="px-8 pt-6 pb-8 border-b border-paper-border">
        <h1 className="font-serif text-3xl tracking-tight">{event.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} /> {event.date.toISOString().slice(0, 10)} ·{" "}
            {event.startTime}–{event.endTime}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {event.location}
            </span>
          )}
          <span>· {event.slotMinutes}-min slots</span>
        </div>
        {event.description && (
          <p className="mt-4 text-sm whitespace-pre-wrap max-w-2xl text-ink-muted">
            {event.description}
          </p>
        )}
      </header>

      <div className="px-8 py-8">
        <h2 className="font-medium mb-4">
          Bookings ({event.slots.length})
        </h2>
        {event.slots.length === 0 ? (
          <div className="ll-card p-10 text-center text-sm text-ink-muted">
            No bookings yet. Share the public link from the Castings page.
          </div>
        ) : (
          <div className="ll-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-paper border-b border-paper-border text-ink-subtle text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Time</th>
                  <th className="text-left font-medium px-5 py-3">Name</th>
                  <th className="text-left font-medium px-5 py-3">Email</th>
                  <th className="text-left font-medium px-5 py-3">Phone</th>
                  <th className="text-left font-medium px-5 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {event.slots.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-paper-border last:border-0 hover:bg-paper/50"
                  >
                    <td className="px-5 py-3 font-mono text-xs">
                      {s.startAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium">{s.bookedName}</td>
                    <td className="px-5 py-3 text-ink-muted">{s.bookedEmail}</td>
                    <td className="px-5 py-3 text-ink-muted">{s.bookedPhone}</td>
                    <td className="px-5 py-3 text-xs text-ink-muted">{s.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
