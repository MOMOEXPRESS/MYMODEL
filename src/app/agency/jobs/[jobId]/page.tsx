import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { JobActions } from "./job-actions";
import { JobEditForm } from "./job-edit-form";
import { AssignmentsSection } from "./assignments-section";
import { ContactsSection } from "./contacts-section";
import { JobRoomSection } from "./job-room-section";
import { TravelSection } from "./travel-section";
import { LookBoardSection } from "./look-board-section";
import { BookingWorkspaceTabs } from "./booking-workspace-tabs";

export default async function JobDetail({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await requireAgencyStaff();
  const { jobId } = await params;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      contacts: { orderBy: { role: "asc" } },
      assignments: {
        include: {
          model: { include: { user: true } },
        },
        orderBy: [{ status: "asc" }, { proposedAt: "asc" }],
      },
      owner: { select: { displayName: true } },
      client: true,
      travelItems: { orderBy: { startAt: "asc" } },
      room: {
        include: {
          files: {
            orderBy: { createdAt: "desc" },
            include: { uploadedBy: { select: { displayName: true } } },
          },
          schedule: { orderBy: { date: "asc" } },
        },
      },
      outfits: {
        orderBy: { order: "asc" },
        include: {
          reactions: {
            include: { option: false },
          },
        },
      },
    },
  });
  if (!job || job.agencyId !== user.agencyId) notFound();

  // Resolve model names for the outfit reactions.
  const reactionModelIds = Array.from(
    new Set(job.outfits.flatMap((o) => o.reactions.map((r) => r.modelId))),
  );
  const reactionModels = reactionModelIds.length
    ? await prisma.user.findMany({
        where: { id: { in: reactionModelIds } },
        select: { id: true, displayName: true },
      })
    : [];
  const nameById = new Map(reactionModels.map((m) => [m.id, m.displayName]));

  // Load roster for the attach-models dialog.
  const roster = await prisma.model.findMany({
    where: { agencyId: user.agencyId, status: "ACTIVE" },
    include: { user: { select: { displayName: true, email: true } } },
    orderBy: { user: { displayName: "asc" } },
  });

  // Clients dropdown for the edit form.
  const clients = await prisma.client.findMany({
    where: { agencyId: user.agencyId },
    select: { id: true, name: true, companyName: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="px-8 pt-8">
        <Link
          href="/agency/bookings"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> All bookings
        </Link>
      </div>

      {/* Header */}
      <header className="px-8 pt-6 pb-8 border-b border-paper-border">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
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
              {typeof job.defaultRate === "number" && (
                <span>
                  · {job.currency} {job.defaultRate.toLocaleString()} / {job.rateType.toLowerCase()}
                </span>
              )}
              <span>· booked by {job.owner.displayName}</span>
            </div>
          </div>
          <JobActions jobId={job.id} status={job.status} />
        </div>
      </header>

      <div className="px-8 pb-12">
        <BookingWorkspaceTabs
          children={{
            lineup: (
              <AssignmentsSection
                job={{
                  id: job.id,
                  defaultRate: job.defaultRate,
                  rateType: job.rateType,
                  currency: job.currency,
                }}
                assignments={job.assignments.map((a) => ({
                  id: a.id,
                  status: a.status,
                  rate: a.rate,
                  rateType: a.rateType,
                  notes: a.notes,
                  callTime: a.callTime,
                  wrapTime: a.wrapTime,
                  modelProposedRate: a.modelProposedRate,
                  modelRateNote: a.modelRateNote,
                  callsheetReadAt: a.callsheetReadAt?.toISOString() ?? null,
                  checkedInAt: a.checkedInAt?.toISOString() ?? null,
                  clientReaction: a.clientReaction,
                  clientReactionNote: a.clientReactionNote,
                  model: {
                    userId: a.model.userId,
                    division: a.model.division,
                    displayName: a.model.user.displayName,
                  },
                }))}
                roster={roster.map((m) => ({
                  userId: m.userId,
                  division: m.division,
                  displayName: m.user.displayName,
                  email: m.user.email,
                }))}
              />
            ),
            details: (
              <div className="max-w-xl space-y-6">
                <JobEditForm
                  job={{
                    id: job.id,
                    title: job.title,
                    type: job.type,
                    startDate: iso(job.startDate),
                    endDate: iso(job.endDate),
                    location: job.location,
                    locationCity: job.locationCity,
                    brief: job.brief,
                    defaultRate: job.defaultRate,
                    rateType: job.rateType,
                    currency: job.currency,
                    usageTerritory: job.usageTerritory,
                    usageDuration: job.usageDuration,
                    usageMedia: job.usageMedia,
                    usageExpiresAt: job.usageExpiresAt ? iso(job.usageExpiresAt) : null,
                    exclusivityCategory: job.exclusivityCategory,
                    clientId: job.clientId,
                  }}
                  clients={clients}
                />
                <ContactsSection jobId={job.id} contacts={job.contacts} />
              </div>
            ),
            production: (
              <div className="space-y-8">
                <JobRoomSection
                  jobId={job.id}
                  meUserId={user.id}
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
                <TravelSection
                  jobId={job.id}
                  assignedModels={job.assignments.map((a) => ({
                    userId: a.model.userId,
                    displayName: a.model.user.displayName,
                  }))}
                  items={job.travelItems.map((t) => {
                    const m = job.assignments.find((a) => a.model.userId === t.modelId);
                    return {
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
                      modelName: m?.model.user.displayName ?? null,
                    };
                  })}
                />
                <LookBoardSection
                  jobId={job.id}
                  outfits={job.outfits.map((o) => ({
                    id: o.id,
                    title: o.title,
                    imageUrl: o.imageUrl,
                    notes: o.notes,
                    reactions: o.reactions.map((r) => ({
                      modelName: nameById.get(r.modelId) ?? "Model",
                      reaction: r.reaction,
                      note: r.note,
                    })),
                  }))}
                />
              </div>
            ),
            client: (
              <div className="max-w-lg ll-card p-6 space-y-4">
                <h3 className="font-semibold">Client portal</h3>
                {job.client ? (
                  <>
                    <p className="text-sm text-ink-muted">
                      {job.client.name}
                      {job.client.companyName ? ` · ${job.client.companyName}` : ""}
                    </p>
                    {job.client.portalEnabled && job.client.portalToken ? (
                      <p className="text-sm">
                        <span className="text-ink-subtle">Link: </span>
                        <a
                          className="text-accent hover:underline break-all"
                          href={`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/client/${job.client.portalToken}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open client view
                        </a>
                      </p>
                    ) : (
                      <p className="text-sm text-ink-muted">
                        Portal not enabled — turn it on in Clients.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">No client linked to this booking.</p>
                )}
              </div>
            ),
          }}
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

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
