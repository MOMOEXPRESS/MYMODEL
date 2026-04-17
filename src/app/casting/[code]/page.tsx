import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { BookingForm } from "./booking-form";

// Public booking page for a casting event. No auth — just the code in the URL.

export default async function CastingBookingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const event = await prisma.castingEvent.findUnique({
    where: { code },
    include: {
      agency: { select: { name: true, logoUrl: true } },
      slots: { where: { bookedAt: { not: null } }, select: { startAt: true } },
    },
  });
  if (!event) notFound();

  const takenIso = new Set(event.slots.map((s) => s.startAt.toISOString()));

  // Materialize slots between startTime and endTime.
  const slots: { iso: string; label: string }[] = [];
  const [sh, sm] = event.startTime.split(":").map(Number);
  const [eh, em] = event.endTime.split(":").map(Number);
  const dayUtc = new Date(event.date);
  const cursor = new Date(
    Date.UTC(dayUtc.getUTCFullYear(), dayUtc.getUTCMonth(), dayUtc.getUTCDate(), sh, sm),
  );
  const end = new Date(
    Date.UTC(dayUtc.getUTCFullYear(), dayUtc.getUTCMonth(), dayUtc.getUTCDate(), eh, em),
  );
  while (cursor.getTime() < end.getTime()) {
    slots.push({
      iso: cursor.toISOString(),
      label: cursor.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }),
    });
    cursor.setUTCMinutes(cursor.getUTCMinutes() + event.slotMinutes);
  }

  const available = slots.filter((s) => !takenIso.has(s.iso));

  return (
    <div className="min-h-screen bg-paper">
      <header className="px-8 py-8 border-b border-paper-border">
        <div className="text-xs uppercase tracking-[0.2em] text-ink-subtle">
          {event.agency.name}
        </div>
        <h1 className="mt-2 font-serif text-4xl tracking-tight">{event.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} /> {event.date.toISOString().slice(0, 10)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {event.location}
            </span>
          )}
          <span>· {event.slotMinutes}-minute slots</span>
        </div>
      </header>

      <main className="px-8 py-8 grid lg:grid-cols-[1fr_400px] gap-8 max-w-5xl">
        <section>
          {event.description && (
            <div className="ll-card p-5">
              <h2 className="font-medium">Details</h2>
              <p className="mt-2 text-sm whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
          <div className="mt-4 text-xs text-ink-muted">
            {available.length} of {slots.length} slots available.
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 self-start">
          <BookingForm code={code} slots={available} allSlots={slots.length} />
        </aside>
      </main>
    </div>
  );
}
