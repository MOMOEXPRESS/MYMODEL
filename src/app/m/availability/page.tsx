import Link from "next/link";
import { Info } from "lucide-react";
import { requireModel } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { AvailabilityCalendar } from "./availability-calendar";

const WEEKS = 10;

export default async function ModelAvailabilityPage() {
  const user = await requireModel();
  const today = new Date();
  const today0 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const until = new Date(today0.getTime() + WEEKS * 7 * 86400 * 1000);

  const [availability, holds] = await Promise.all([
    prisma.availability.findMany({
      where: { modelId: user.id, date: { gte: today0, lte: until } },
    }),
    // Active holds (from assignments) in the same window so the model
    // sees what the agency already put them on.
    prisma.hold.findMany({
      where: { modelId: user.id, date: { gte: today0, lte: until } },
      include: { job: { select: { id: true, title: true, status: true } } },
    }),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Availability</h1>
          <p className="mt-2 text-sm text-ink-muted max-w-xl">
            Click a day to cycle it. Your agency sees this instantly and won&apos;t
            pitch you on days you&apos;re off.
          </p>
        </div>
        <Link href="/m/card" className="ll-btn-ghost text-xs">
          Edit my card &rarr;
        </Link>
      </div>

      <div className="mt-4 ll-card p-3 flex items-start gap-2 text-xs text-ink-muted">
        <Info size={14} className="mt-0.5 shrink-0 text-ink" />
        <p>
          <strong className="text-ink">Free</strong> = open for bookings.{" "}
          <strong className="text-ink">Off</strong> = blocked, personal.{" "}
          <strong className="text-ink">Traveling</strong> = on the road but
          potentially reachable. Days already held by a confirmed job appear
          green and can&apos;t be changed from here.
        </p>
      </div>

      <div className="mt-6">
        <AvailabilityCalendar
          modelId={user.id}
          weeks={WEEKS}
          initialAvailability={availability.map((a) => ({
            iso: a.date.toISOString().slice(0, 10),
            status: a.status,
            reason: a.reason,
          }))}
          holds={holds.map((h) => ({
            iso: h.date.toISOString().slice(0, 10),
            jobId: h.job.id,
            jobTitle: h.job.title,
            priority: h.priority,
          }))}
        />
      </div>
    </div>
  );
}
