import Link from "next/link";
import { Briefcase } from "lucide-react";
import { requireModel } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { assignmentHoldDetail, assignmentSimpleLabel } from "@/lib/status-language";
import { cn } from "@/lib/utils";

export default async function ModelBookingsPage() {
  const user = await requireModel();
  const today = startOfTodayUTC();

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      modelId: user.id,
      status: { notIn: ["DECLINED", "RELEASED"] },
      job: { endDate: { gte: today }, deletedAt: null },
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          locationCity: true,
          status: true,
          room: { select: { id: true } },
        },
      },
    },
    orderBy: { job: { startDate: "asc" } },
  });

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">Bookings</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Holds and confirmed jobs from your agency — tap a booking for details and the job room.
      </p>

      {assignments.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Briefcase size={20} />}
            title="No active bookings"
            body="When you're on hold or confirmed, every job shows up here."
          />
        </div>
      ) : (
        <ul className="mt-6 ll-card divide-y divide-paper-border">
          {assignments.map((a) => {
            const detail = assignmentHoldDetail(a.status);
            const simple = assignmentSimpleLabel(a.status);
            return (
              <li key={a.id} className="px-4 py-3 flex items-center gap-4">
                <StatusPill simple={simple} detail={detail} status={a.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.job.title}</div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {formatDates(a.job.startDate, a.job.endDate)}
                    {a.job.locationCity ? ` · ${a.job.locationCity}` : ""}
                  </div>
                </div>
                <Link href={`/m/jobs/${a.job.id}`} className="ll-btn-secondary text-xs shrink-0">
                  {a.job.room ? "Open" : "View"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({
  simple,
  detail,
  status,
}: {
  simple: string;
  detail: string | null;
  status: string;
}) {
  const style =
    status === "CONFIRMED"
      ? "bg-board-confirmed/20 text-board-confirmed"
      : status === "OPTION_1"
        ? "bg-board-option1/20 text-board-option1"
        : status === "OPTION_2"
          ? "bg-board-option2/70 text-ink"
          : "bg-board-option3 text-ink";
  return (
    <span className={cn("text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0", style)}>
      {detail ?? simple}
    </span>
  );
}

function formatDates(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (start.getTime() === end.getTime()) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function startOfTodayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}
