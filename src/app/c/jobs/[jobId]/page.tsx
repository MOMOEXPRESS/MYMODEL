import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClient } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { ClientJobApprovals } from "./client-job-approvals";

export default async function ClientJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const user = await requireClient();
  const { jobId } = await params;

  const clientIds = (
    await prisma.client.findMany({
      where: { platformUserId: user.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const job = await prisma.job.findFirst({
    where: { id: jobId, clientId: { in: clientIds }, deletedAt: null },
    include: {
      agency: { select: { name: true } },
      assignments: {
        where: { status: { in: ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED"] } },
        include: {
          model: {
            include: {
              user: { select: { displayName: true } },
              portfolio: { take: 1, orderBy: { order: "asc" } },
            },
          },
        },
      },
    },
  });
  if (!job) notFound();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link href="/c/jobs" className="text-xs text-ink-muted hover:text-ink">
        ← Bookings
      </Link>
      <div>
        <p className="text-xs text-ink-subtle">{job.agency.name}</p>
        <h1 className="font-serif text-2xl tracking-tight mt-1">{job.title}</h1>
        <p className="text-sm text-ink-muted mt-2">
          {job.startDate.toISOString().slice(0, 10)} → {job.endDate.toISOString().slice(0, 10)}
          {job.locationCity ? ` · ${job.locationCity}` : ""}
        </p>
      </div>
      {job.brief && (
        <div className="ll-card p-4 text-sm text-ink-muted whitespace-pre-wrap">{job.brief}</div>
      )}
      <ClientJobApprovals
        assignments={job.assignments.map((a) => ({
          id: a.id,
          status: a.status,
          imageUrl: a.model.portfolio[0]?.url ?? null,
          modelName: a.model.user.displayName,
          division: a.model.division,
          clientReaction: a.clientReaction,
          clientReactionNote: a.clientReactionNote,
        }))}
      />
    </div>
  );
}
