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
});

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
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.agencyId !== user.agencyId) {
    return { ok: false as const, error: "Not found" };
  }
  await prisma.job.update({ where: { id: jobId }, data: { status: status as JobStatus } });
  revalidatePath(`/agency/jobs/${jobId}`);
  revalidatePath("/agency/jobs");
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
  confirmConflicts: z.enum(["1"]).optional(),
});

export async function updateAssignment(formData: FormData) {
  const user = await requireAgencyStaff();
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
  }

  const before = { status: a.status, rate: a.rate, rateType: a.rateType };

  await prisma.jobAssignment.update({
    where: { id: d.assignmentId },
    data: {
      status: d.status,
      rate: d.rate ?? null,
      rateType: d.rateType ?? null,
      notes: d.notes ?? null,
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
