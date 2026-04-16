import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { requireModel } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { JobRoomSection } from "@/app/agency/jobs/[jobId]/job-room-section";

export default async function ModelJobDetail({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await requireModel();
  const { jobId } = await params;

  const assignment = await prisma.jobAssignment.findFirst({
    where: { jobId, modelId: user.id },
  });
  if (!assignment) notFound();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      room: {
        include: {
          files: {
            orderBy: { createdAt: "desc" },
            include: { uploadedBy: { select: { displayName: true } } },
          },
          schedule: { orderBy: { date: "asc" } },
        },
      },
      contacts: { orderBy: { role: "asc" } },
    },
  });
  if (!job || job.agencyId !== user.agencyId) notFound();

  // Chat + room are writable for CONFIRMED; read-plus-chat for options.
  // Files/schedule edits are staff-only on the model side.
  const readOnlyRoom = true;

  return (
    <div>
      <div>
        <Link href="/m" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft size={14} /> Next up
        </Link>
      </div>

      <header className="mt-4">
        <div className="text-xs uppercase tracking-wider text-ink-subtle">
          {job.type.toLowerCase()}
        </div>
        <h1 className="font-serif text-3xl tracking-tight mt-1">{job.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span>{formatDates(job.startDate, job.endDate)}</span>
          {(job.location || job.locationCity) && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {[job.location, job.locationCity].filter(Boolean).join(", ")}
            </span>
          )}
        </div>
      </header>

      {job.brief && (
        <section className="mt-6 ll-card p-5">
          <h2 className="font-medium">Brief</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{job.brief}</p>
        </section>
      )}

      <div className="mt-6">
        <JobRoomSection
          jobId={job.id}
          meUserId={user.id}
          readOnly={readOnlyRoom}
          files={
            job.room
              ? job.room.files.map((f) => ({
                  id: f.id,
                  name: f.name,
                  type: f.type,
                  url: f.url,
                  uploadedByName: f.uploadedBy.displayName,
                  uploadedAt: f.createdAt.toISOString(),
                }))
              : []
          }
          schedule={
            job.room
              ? job.room.schedule.map((s) => ({
                  id: s.id,
                  title: s.title,
                  date: s.date.toISOString().slice(0, 10),
                  time: s.time,
                  location: s.location,
                  notes: s.notes,
                }))
              : []
          }
        />
      </div>
    </div>
  );
}

function formatDates(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  if (start.getTime() === end.getTime()) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}
