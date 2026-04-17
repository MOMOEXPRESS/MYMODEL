import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { CastingsClient } from "./castings-client";

export default async function CastingsPage() {
  const user = await requireAgencyStaff();
  const events = await prisma.castingEvent.findMany({
    where: { agencyId: user.agencyId },
    include: {
      slots: { where: { bookedAt: { not: null } }, orderBy: { startAt: "asc" } },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Castings"
        title="Casting calls"
        subtitle="Schedule an open call and share one public link — prospects book a slot themselves."
      />
      <div className="px-8 py-8">
        <CastingsClient
          events={events.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            location: e.location,
            date: e.date.toISOString().slice(0, 10),
            slotMinutes: e.slotMinutes,
            startTime: e.startTime,
            endTime: e.endTime,
            code: e.code,
            bookingsCount: e.slots.length,
          }))}
        />
      </div>
    </div>
  );
}
