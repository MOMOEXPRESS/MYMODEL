"use server";

// Server actions for Jobs, JobContacts, and JobAssignments.
// All tenant-guarded through requireAgencyStaff().

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AssignmentStatus,
  JobStatus,
  JobType,
  RateType,
  JobContactRole,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { syncHoldsForJob, detectConflicts } from "@/lib/holds";
import { logEvent } from "@/lib/audit";
import { requireCan, ForbiddenError } from "@/lib/permissions";

function forbiddenMsg(err: unknown, fallback: string): string {
  return err instanceof ForbiddenError ? err.message : fallback;
}

// ── Jobs ───────────────────────────────────────────────────────────

const createJobSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.nativeEnum(JobType),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().max(120).optional().nullable(),
  locationCity: z.string().max(80).optional().nullable(),
  brief: z.string().max(5000).optional().nullable(),
  defaultRate: z.coerce.number().min(0).max(10_000_000).optional().nullable(),
  rateType: z.nativeEnum(RateType).default("DAY"),
  currency: z.string().length(3).optional(),
  usageTerritory: z.string().max(80).optional().nullable(),
  usageDuration: z.string().max(80).optional().nullable(),
  usageMedia: z.string().max(400).optional().nullable(), // comma-separated
  usageExpiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  exclusivityCategory: z.string().max(120).optional().nullable(),
});

function splitCsv(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createJob(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "job.create");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }

  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = createJobSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const start = new Date(d.startDate + "T00:00:00.000Z");
  const end = new Date(d.endDate + "T00:00:00.000Z");
  if (end.getTime() < start.getTime()) {
    return { ok: false as const, error: "End date cannot be before start date" };
  }

  const job = await prisma.job.create({
    data: {
      agencyId: user.agencyId,
      ownerUserId: user.id,
      title: d.title,
      type: d.type,
      startDate: start,
      endDate: end,
      location: d.location ?? null,
      locationCity: d.locationCity ?? null,
      brief: d.brief ?? null,
      defaultRate: d.defaultRate ?? null,
      rateType: d.rateType,
      currency: d.currency ?? user.agency.currency,
      status: JobStatus.OPEN,
      usageTerritory: d.usageTerritory ?? null,
      usageDuration: d.usageDuration ?? null,
      usageMedia: splitCsv(d.usageMedia),
      usageExpiresAt: d.usageExpiresAt ? new Date(d.usageExpiresAt + "T00:00:00.000Z") : null,
      exclusivityCategory: d.exclusivityCategory?.trim() || null,
    },
  });

  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "job.created",
    entityType: "Job",
    entityId: job.id,
    summary: `Created ${job.title}`,
  });

  revalidatePath("/agency/jobs");
  redirect(`/agency/jobs/${job.id}`);
}

const updateJobSchema = createJobSchema.extend({
  jobId: z.string().cuid(),
});

export async function updateJob(formData: FormData) {
  const user = await requireAgencyStaff();
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = updateJobSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const job = await prisma.job.findUnique({ where: { id: d.jobId } });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }

  const start = new Date(d.startDate + "T00:00:00.000Z");
  const end = new Date(d.endDate + "T00:00:00.000Z");
  if (end.getTime() < start.getTime()) {
    return { ok: false as const, error: "End date cannot be before start date" };
  }

  const datesChanged =
    start.getTime() !== job.startDate.getTime() || end.getTime() !== job.endDate.getTime();

  await prisma.job.update({
    where: { id: d.jobId },
    data: {
      title: d.title,
      type: d.type,
      startDate: start,
      endDate: end,
      location: d.location ?? null,
      locationCity: d.locationCity ?? null,
      brief: d.brief ?? null,
      defaultRate: d.defaultRate ?? null,
      rateType: d.rateType,
      currency: d.currency ?? undefined,
      usageTerritory: d.usageTerritory ?? null,
      usageDuration: d.usageDuration ?? null,
      usageMedia: splitCsv(d.usageMedia),
      usageExpiresAt: d.usageExpiresAt ? new Date(d.usageExpiresAt + "T00:00:00.000Z") : null,
      exclusivityCategory: d.exclusivityCategory?.trim() || null,
    },
  });

  if (datesChanged) {
    await syncHoldsForJob(d.jobId);
  }
  revalidatePath(`/agency/jobs/${d.jobId}`);
  revalidatePath("/agency/jobs");
  revalidatePath("/agency/board");
  return { ok: true as const };
}

export async function setJobStatus(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "job.status_change");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const jobId = String(formData.get("jobId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!Object.values(JobStatus).includes(status as JobStatus)) {
    return { ok: false as const, error: "Invalid status" };
  }
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { assignments: { select: { modelId: true, status: true } } },
  });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  const nextStatus = status as JobStatus;
  await prisma.job.update({ where: { id: jobId }, data: { status: nextStatus } });

  // If the job was cancelled, notify any model who had an active option or
  // confirmed slot so they can re-open their calendar immediately.
  if (nextStatus === JobStatus.CANCELLED && job.status !== JobStatus.CANCELLED) {
    const activeStatuses: AssignmentStatus[] = [
      AssignmentStatus.PROPOSED,
      AssignmentStatus.OPTION_1,
      AssignmentStatus.OPTION_2,
      AssignmentStatus.OPTION_3,
      AssignmentStatus.CONFIRMED,
    ];
    const affectedModelIds = Array.from(
      new Set(job.assignments.filter((a) => activeStatuses.includes(a.status)).map((a) => a.modelId)),
    );
    if (affectedModelIds.length > 0) {
      await prisma.notification.createMany({
        data: affectedModelIds.map((modelId) => ({
          userId: modelId,
          type: "JOB_CANCELLED",
          payload: {
            jobId,
            jobTitle: job.title,
            message: `${job.title} was cancelled — your dates are free again.`,
          },
        })),
      });
      // Release all active assignments so holds clear on the Board.
      await prisma.jobAssignment.updateMany({
        where: { jobId, status: { in: activeStatuses } },
        data: { status: AssignmentStatus.RELEASED },
      });
      await syncHoldsForJob(jobId);
    }
  }

  revalidatePath(`/agency/jobs/${jobId}`);
  revalidatePath("/agency/jobs");
  revalidatePath("/agency/board");
  return { ok: true as const };
}

export async function deleteJob(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "job.delete");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const jobId = String(formData.get("jobId") ?? "");
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  // Soft delete — Trash for 30 days, then the cron purges.
  await prisma.job.update({
    where: { id: jobId },
    data: { deletedAt: new Date(), deletedById: user.id },
  });
  // Strip holds immediately so the Board reflects it. Assignments stay for
  // audit; restoring the job brings everything back.
  await prisma.hold.deleteMany({ where: { jobId } });
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "job.deleted",
    entityType: "Job",
    entityId: jobId,
    summary: `Deleted ${job.title}`,
  });
  revalidatePath("/agency/jobs");
  revalidatePath("/agency/board");
  redirect("/agency/jobs");
}

// Duplicate a job, copying contacts and a fresh date range. Doesn't copy
// assignments — the new job is empty so the booker can re-pitch.
export async function duplicateJob(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "job.create");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const sourceId = String(formData.get("jobId") ?? "");
  const source = await prisma.job.findUnique({
    where: { id: sourceId },
    include: { contacts: true },
  });
  if (!source || source.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }

  // Default to a one-week shift forward — overrideable via formData.
  const offsetDays =
    Number(formData.get("offsetDays") ?? "") || 7;
  const newStart = new Date(source.startDate);
  newStart.setUTCDate(newStart.getUTCDate() + offsetDays);
  const newEnd = new Date(source.endDate);
  newEnd.setUTCDate(newEnd.getUTCDate() + offsetDays);

  const dup = await prisma.job.create({
    data: {
      agencyId: source.agencyId,
      ownerUserId: user.id,
      title: `${source.title} (copy)`,
      type: source.type,
      startDate: newStart,
      endDate: newEnd,
      location: source.location,
      locationCity: source.locationCity,
      brief: source.brief,
      defaultRate: source.defaultRate,
      currency: source.currency,
      rateType: source.rateType,
      status: JobStatus.DRAFT,
      contacts: {
        create: source.contacts.map((c) => ({
          name: c.name,
          role: c.role,
          company: c.company,
          email: c.email,
          phone: c.phone,
        })),
      },
    },
  });

  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "job.duplicated",
    entityType: "Job",
    entityId: dup.id,
    summary: `Duplicated ${source.title}`,
  });

  revalidatePath("/agency/jobs");
  redirect(`/agency/jobs/${dup.id}`);
}

export async function restoreJob(formData: FormData) {
  const user = await requireAgencyStaff();
  const jobId = String(formData.get("jobId") ?? "");
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.job.update({
    where: { id: jobId },
    data: { deletedAt: null, deletedById: null },
  });
  await syncHoldsForJob(jobId);
  await logEvent({
    agencyId: user.agencyId,
    actorId: user.id,
    actorName: user.displayName,
    action: "job.restored",
    entityType: "Job",
    entityId: jobId,
    summary: `Restored ${job.title}`,
  });
  revalidatePath("/agency/jobs");
  revalidatePath("/agency/board");
  return { ok: true as const };
}

// ── Contacts ──────────────────────────────────────────────────────

const contactSchema = z.object({
  jobId: z.string().cuid(),
  name: z.string().min(1).max(120),
  role: z.nativeEnum(JobContactRole).default("CLIENT"),
  company: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().or(z.literal("").transform(() => null)).nullable(),
  phone: z.string().max(40).optional().nullable(),
});

export async function addJobContact(formData: FormData) {
  const user = await requireAgencyStaff();
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const job = await prisma.job.findUnique({ where: { id: d.jobId } });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.jobContact.create({
    data: {
      jobId: d.jobId,
      name: d.name,
      role: d.role,
      company: d.company ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
    },
  });
  revalidatePath(`/agency/jobs/${d.jobId}`);
  return { ok: true as const };
}

export async function deleteJobContact(formData: FormData) {
  const user = await requireAgencyStaff();
  const contactId = String(formData.get("contactId") ?? "");
  const c = await prisma.jobContact.findUnique({
    where: { id: contactId },
    include: { job: { select: { agencyId: true, id: true } } },
  });
  if (!c || c.job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.jobContact.delete({ where: { id: contactId } });
  revalidatePath(`/agency/jobs/${c.job.id}`);
  return { ok: true as const };
}

// ── Assignments ───────────────────────────────────────────────────

export async function attachModelsToJob(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "assignment.create");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const jobId = String(formData.get("jobId") ?? "");
  const modelIds = formData.getAll("modelIds").map(String);
  if (!jobId || modelIds.length === 0) {
    return { ok: false as const, error: "Pick at least one model" };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Job not found" };
  }

  const belongs = await prisma.model.count({
    where: { userId: { in: modelIds }, agencyId: user.agencyId },
  });
  if (belongs !== modelIds.length) {
    return { ok: false as const, error: "One of the models isn't on your roster" };
  }

  // Create PROPOSED assignments. Skip duplicates silently.
  for (const modelId of modelIds) {
    await prisma.jobAssignment.upsert({
      where: { jobId_modelId: { jobId, modelId } },
      create: {
        jobId,
        modelId,
        status: AssignmentStatus.PROPOSED,
        proposedByUserId: user.id,
      },
      update: {}, // leave existing status alone
    });
  }

  await syncHoldsForJob(jobId);
  revalidatePath(`/agency/jobs/${jobId}`);
  revalidatePath("/agency/board");
  return { ok: true as const, added: modelIds.length };
}

const setAssignmentSchema = z.object({
  assignmentId: z.string().cuid(),
  status: z.nativeEnum(AssignmentStatus),
  rate: z.coerce.number().min(0).max(10_000_000).optional().nullable(),
  rateType: z.nativeEnum(RateType).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  callTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  wrapTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  confirmConflicts: z.enum(["1"]).optional(),
  confirmExclusivity: z.enum(["1"]).optional(),
});

export async function updateAssignment(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "assignment.edit");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = setAssignmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const a = await prisma.jobAssignment.findUnique({
    where: { id: d.assignmentId },
    include: { job: true },
  });
  if (!a || a.job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }

  // Conflict check on promotion to CONFIRMED.
  if (d.status === AssignmentStatus.CONFIRMED && a.status !== AssignmentStatus.CONFIRMED) {
    const conflicts = await detectConflicts({
      agencyId: user.agencyId,
      modelId: a.modelId,
      jobId: a.jobId,
      startDate: a.job.startDate,
      endDate: a.job.endDate,
      assumingStatus: AssignmentStatus.CONFIRMED,
    });
    if (conflicts.length > 0 && !d.confirmConflicts) {
      return {
        ok: false as const,
        conflict: true as const,
        conflicts,
        error: "Already confirmed on another job — confirm again to override.",
      };
    }

    // Exclusivity conflict: same model, overlapping date range, same
    // exclusivityCategory on any other CONFIRMED / in-progress job.
    if (a.job.exclusivityCategory) {
      const overlapping = await prisma.jobAssignment.findMany({
        where: {
          modelId: a.modelId,
          status: { in: [AssignmentStatus.CONFIRMED, AssignmentStatus.DONE] },
          jobId: { not: a.jobId },
          job: {
            agencyId: user.agencyId,
            exclusivityCategory: a.job.exclusivityCategory,
            deletedAt: null,
          },
        },
        include: { job: { select: { id: true, title: true, exclusivityCategory: true, usageExpiresAt: true, endDate: true } } },
      });
      const stillActive = overlapping.filter((o) => {
        const cutoff = o.job.usageExpiresAt ?? o.job.endDate;
        return cutoff.getTime() >= a.job.startDate.getTime();
      });
      if (stillActive.length > 0 && !d.confirmExclusivity) {
        return {
          ok: false as const,
          exclusivityConflict: true as const,
          error: `Model is locked on "${a.job.exclusivityCategory}" by ${stillActive[0].job.title}. Confirm again to override.`,
        };
      }
    }
  }

  const before = { status: a.status, rate: a.rate, rateType: a.rateType };

  await prisma.jobAssignment.update({
    where: { id: d.assignmentId },
    data: {
      status: d.status,
      rate: d.rate ?? null,
      rateType: d.rateType ?? null,
      notes: d.notes ?? null,
      callTime: d.callTime ?? null,
      wrapTime: d.wrapTime ?? null,
      // Clear any pending counter-offer once the booker sets a new rate.
      modelProposedRate: d.rate != null && d.rate !== a.rate ? null : undefined,
      modelRateNote: d.rate != null && d.rate !== a.rate ? null : undefined,
      confirmedAt:
        d.status === AssignmentStatus.CONFIRMED ? (a.confirmedAt ?? new Date()) : null,
      declinedAt:
        d.status === AssignmentStatus.DECLINED ? (a.declinedAt ?? new Date()) : null,
    },
  });

  await syncHoldsForJob(a.jobId);

  if (before.status !== d.status) {
    const model = await prisma.user.findUnique({
      where: { id: a.modelId },
      select: { displayName: true },
    });
    await logEvent({
      agencyId: user.agencyId,
      actorId: user.id,
      actorName: user.displayName,
      action: "assignment.status_changed",
      entityType: "JobAssignment",
      entityId: a.id,
      summary: `${model?.displayName ?? "Model"} → ${d.status
        .replace("_", " ")
        .toLowerCase()} on ${a.job.title}`,
      diff: { before, after: { status: d.status, rate: d.rate ?? null, rateType: d.rateType ?? null } },
    });

    // Notify the model on meaningful changes (release, confirm, decline).
    if (d.status === AssignmentStatus.RELEASED) {
      await prisma.notification.create({
        data: {
          userId: a.modelId,
          type: "ASSIGNMENT_RELEASED",
          payload: {
            jobId: a.jobId,
            jobTitle: a.job.title,
            message: "Your hold was released — you're free on those dates again.",
          },
        },
      });
    } else if (d.status === AssignmentStatus.CONFIRMED) {
      await prisma.notification.create({
        data: {
          userId: a.modelId,
          type: "ASSIGNMENT_CONFIRMED",
          payload: {
            jobId: a.jobId,
            jobTitle: a.job.title,
            message: "You're confirmed. Tap in for call sheet and logistics.",
          },
        },
      });
    }
  }

  // Auto-create Job Room when a job has its first CONFIRMED assignment.
  if (d.status === AssignmentStatus.CONFIRMED) {
    await prisma.jobRoom.upsert({
      where: { jobId: a.jobId },
      create: { jobId: a.jobId },
      update: {},
    });
    // Nudge job status if still OPEN.
    if (a.job.status === JobStatus.OPEN) {
      await prisma.job.update({
        where: { id: a.jobId },
        data: { status: JobStatus.CONFIRMED },
      });
    }
  }

  revalidatePath(`/agency/jobs/${a.jobId}`);
  revalidatePath("/agency/board");
  return { ok: true as const };
}

export async function removeAssignment(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "assignment.delete");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const a = await prisma.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: { job: { select: { agencyId: true, id: true } } },
  });
  if (!a || a.job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.jobAssignment.delete({ where: { id: assignmentId } });
  await syncHoldsForJob(a.job.id);
  revalidatePath(`/agency/jobs/${a.job.id}`);
  revalidatePath("/agency/board");
  return { ok: true as const };
}

// ── Rate counter-offer resolution ─────────────────────────────────
// When the model counter-offered from /m/jobs/[id], the booker sees the
// new number on the assignment row. accept → copy into rate; reject →
// clear the counter and ping the model.

export async function respondToCounterOffer(formData: FormData) {
  const user = await requireAgencyStaff();
  try {
    requireCan(user.agencyMembership?.role, "assignment.edit");
  } catch (err) {
    return { ok: false as const, error: forbiddenMsg(err, "Forbidden") };
  }
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "accept" && decision !== "reject") {
    return { ok: false as const, error: "Invalid decision" };
  }
  const a = await prisma.jobAssignment.findUnique({
    where: { id: assignmentId },
    include: { job: { select: { agencyId: true, id: true, title: true } } },
  });
  if (!a || a.job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  if (a.modelProposedRate == null) return { ok: false as const, error: "No counter-offer to respond to" };

  if (decision === "accept") {
    await prisma.jobAssignment.update({
      where: { id: assignmentId },
      data: {
        rate: a.modelProposedRate,
        modelProposedRate: null,
        modelRateNote: null,
      },
    });
    await prisma.notification.create({
      data: {
        userId: a.modelId,
        type: "COUNTER_OFFER_ACCEPTED",
        payload: {
          jobId: a.job.id,
          jobTitle: a.job.title,
          message: "Your rate was accepted.",
        },
      },
    });
  } else {
    await prisma.jobAssignment.update({
      where: { id: assignmentId },
      data: { modelProposedRate: null, modelRateNote: null },
    });
    await prisma.notification.create({
      data: {
        userId: a.modelId,
        type: "COUNTER_OFFER_REJECTED",
        payload: {
          jobId: a.job.id,
          jobTitle: a.job.title,
          message: "Your counter rate was not accepted. Reply to discuss.",
        },
      },
    });
  }

  revalidatePath(`/agency/jobs/${a.job.id}`);
  return { ok: true as const };
}

// ── Outfit / look board (agency side) ─────────────────────────────

const outfitSchema = z.object({
  jobId: z.string().cuid(),
  title: z.string().min(1).max(120),
  imageUrl: z.string().url(),
  notes: z.string().max(600).optional().nullable(),
});

export async function addOutfitOption(formData: FormData) {
  const user = await requireAgencyStaff();
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v === "" ? null : v;
  const parsed = outfitSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;
  const job = await prisma.job.findUnique({ where: { id: d.jobId } });
  if (!job || job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  const max = await prisma.outfitOption.aggregate({
    where: { jobId: d.jobId },
    _max: { order: true },
  });
  await prisma.outfitOption.create({
    data: {
      jobId: d.jobId,
      title: d.title,
      imageUrl: d.imageUrl,
      notes: d.notes ?? null,
      order: (max._max.order ?? -1) + 1,
    },
  });
  revalidatePath(`/agency/jobs/${d.jobId}`);
  revalidatePath(`/m/jobs/${d.jobId}`);
  return { ok: true as const };
}

export async function deleteOutfitOption(formData: FormData) {
  const user = await requireAgencyStaff();
  const optionId = String(formData.get("optionId") ?? "");
  const opt = await prisma.outfitOption.findUnique({
    where: { id: optionId },
    include: { job: { select: { agencyId: true, id: true } } },
  });
  if (!opt || opt.job.agencyId !== user.agencyId) return { ok: false as const, error: "Not found" };
  await prisma.outfitOption.delete({ where: { id: optionId } });
  revalidatePath(`/agency/jobs/${opt.job.id}`);
  revalidatePath(`/m/jobs/${opt.job.id}`);
  return { ok: true as const };
}
