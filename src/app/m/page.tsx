import Link from "next/link";
import { Calendar, Radio, Briefcase } from "lucide-react";
import { requireModel } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/empty-state";
import { BroadcastCard } from "./broadcast-card";

export default async function ModelHome() {
  const user = await requireModel();
  const today = startOfTodayUTC();

  const [pendingBroadcasts, upcomingAssignments] = await Promise.all([
    prisma.broadcastResponse.findMany({
      where: { modelId: user.id, response: "NO_RESPONSE" },
      include: {
        broadcast: {
          include: {
            sender: { select: { displayName: true } },
            job: { select: { id: true, title: true, startDate: true, endDate: true, locationCity: true } },
          },
        },
      },
      orderBy: { broadcast: { createdAt: "desc" } },
      take: 20,
    }),
    prisma.jobAssignment.findMany({
      where: {
        modelId: user.id,
        status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] },
        job: { endDate: { gte: today } },
      },
      include: {
        job: {
          select: {
            id: true, title: true, startDate: true, endDate: true,
            locationCity: true, location: true, type: true, status: true,
            room: { select: { id: true } },
          },
        },
      },
      orderBy: { job: { startDate: "asc" } },
    }),
  ]);

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">
        Hi, {user.displayName.split(" ")[0]}.
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Here&apos;s what&apos;s coming up.</p>

      {pendingBroadcasts.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Radio size={14} /> Needs your response
          </div>
          <div className="mt-3 space-y-3">
            {pendingBroadcasts.map((p) => (
              <BroadcastCard
                key={p.broadcastId}
                id={p.broadcastId}
                body={p.broadcast.body}
                senderName={p.broadcast.sender.displayName}
                sentAt={p.broadcast.createdAt.toISOString()}
                job={
                  p.broadcast.job
                    ? {
                        title: p.broadcast.job.title,
                        start: p.broadcast.job.startDate.toISOString().slice(0, 10),
                        end: p.broadcast.job.endDate.toISOString().slice(0, 10),
                        city: p.broadcast.job.locationCity ?? null,
                      }
                    : null
                }
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar size={14} /> Upcoming
        </div>
        {upcomingAssignments.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={<Briefcase size={20} />}
              title="Nothing booked yet"
              body="Holds and confirmed jobs will appear here as your agency books you."
            />
          </div>
        ) : (
          <ul className="mt-3 ll-card divide-y divide-paper-border">
            {upcomingAssignments.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-center gap-4">
                <StatusPill status={a.status} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.job.title}</div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {formatDates(a.job.startDate, a.job.endDate)}
                    {a.job.locationCity ? ` · ${a.job.locationCity}` : ""}
                  </div>
                </div>
                {a.status === "CONFIRMED" && a.job.room && (
                  <Link href={`/m/jobs/${a.job.id}`} className="ll-btn-secondary text-xs">
                    Open room
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status.replace("_", " ").toLowerCase();
  const style =
    status === "CONFIRMED"
      ? "bg-board-confirmed/20 text-board-confirmed"
      : status === "OPTION_1"
        ? "bg-board-option1/20 text-board-option1"
        : status === "OPTION_2"
          ? "bg-board-option2/70 text-ink"
          : "bg-board-option3 text-ink";
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md ${style}`}>
      {label}
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
