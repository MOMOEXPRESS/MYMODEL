import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { requireModel } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { JobRoomSection } from "@/app/agency/jobs/[jobId]/job-room-section";
import { TravelSection } from "@/app/agency/jobs/[jobId]/travel-section";
import { HoldDecisionBar } from "./decision-bar";
import {
  RatePanel,
  CallsheetConfirm,
  CheckInButton,
  LookBoardReactions,
} from "./model-widgets";

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
      travelItems: {
        where: { OR: [{ modelId: null }, { modelId: user.id }] },
        orderBy: { startAt: "asc" },
      },
      outfits: { orderBy: { order: "asc" } },
    },
  });
  if (!job || job.agencyId !== user.agencyId) notFound();

  // Look up this model's reactions to every outfit on the job.
  const myReactions = await prisma.outfitReaction.findMany({
    where: { modelId: user.id, optionId: { in: job.outfits.map((o) => o.id) } },
  });
  const reactionByOption = new Map(myReactions.map((r) => [r.optionId, r]));

  // Is today inside the shoot window (±1d)?
  const now = new Date();
  const earliest = new Date(job.startDate.getTime() - 86400 * 1000);
  const latest = new Date(job.endDate.getTime() + 86400 * 1000);
  const isShootDay = now.getTime() >= earliest.getTime() && now.getTime() <= latest.getTime();

  // Latest callsheet file, if any.
  const callsheet = job.room?.files.find((f) => f.type === "CALLSHEET");

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

      <div className="mt-6">
        <HoldDecisionBar jobId={job.id} status={assignment.status} />
      </div>

      <div className="mt-6 grid gap-3">
        <RatePanel
          jobId={job.id}
          rate={assignment.rate}
          rateType={assignment.rateType}
          currency={job.currency}
          counterRate={assignment.modelProposedRate}
          counterNote={assignment.modelRateNote}
        />
        {(assignment.status === "CONFIRMED" || assignment.status === "DONE") && (
          <>
            <CallsheetConfirm
              jobId={job.id}
              callsheetUrl={callsheet?.url ?? null}
              confirmedAt={assignment.callsheetReadAt?.toISOString() ?? null}
            />
            <CheckInButton
              jobId={job.id}
              isShootDay={isShootDay}
              checkedInAt={assignment.checkedInAt?.toISOString() ?? null}
            />
          </>
        )}
      </div>

      {(job.usageTerritory || job.usageDuration || (job.usageMedia?.length ?? 0) > 0) && (
        <section className="mt-6 ll-card p-5">
          <h2 className="font-medium">Usage rights</h2>
          <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            {job.usageTerritory && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-subtle">Territory</dt>
                <dd>{job.usageTerritory}</dd>
              </div>
            )}
            {job.usageDuration && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-subtle">Duration</dt>
                <dd>{job.usageDuration}</dd>
              </div>
            )}
            {job.usageMedia && job.usageMedia.length > 0 && (
              <div className="sm:col-span-1">
                <dt className="text-[10px] uppercase tracking-wider text-ink-subtle">Media</dt>
                <dd>{job.usageMedia.join(", ")}</dd>
              </div>
            )}
            {job.usageExpiresAt && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-ink-subtle">Expires</dt>
                <dd>{job.usageExpiresAt.toISOString().slice(0, 10)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {job.brief && (
        <section className="mt-6 ll-card p-5">
          <h2 className="font-medium">Brief</h2>
          <p className="mt-2 text-sm whitespace-pre-wrap">{job.brief}</p>
        </section>
      )}

      <div className="mt-6">
        <LookBoardReactions
          outfits={job.outfits.map((o) => {
            const r = reactionByOption.get(o.id);
            return {
              id: o.id,
              title: o.title,
              imageUrl: o.imageUrl,
              notes: o.notes,
              myReaction: r?.reaction ?? null,
              myNote: r?.note ?? null,
            };
          })}
        />
      </div>

      {job.travelItems.length > 0 && (
        <div className="mt-6">
          <TravelSection
            jobId={job.id}
            assignedModels={[]}
            readOnly
            items={job.travelItems.map((t) => ({
              id: t.id,
              type: t.type,
              title: t.title,
              description: t.description,
              fromLocation: t.fromLocation,
              toLocation: t.toLocation,
              startAt: t.startAt?.toISOString() ?? null,
              endAt: t.endAt?.toISOString() ?? null,
              reference: t.reference,
              modelId: t.modelId,
              modelName: null,
            }))}
          />
        </div>
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
