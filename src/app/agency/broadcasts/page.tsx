import Link from "next/link";
import { Radio } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { BroadcastsClient } from "./broadcasts-client";

export default async function BroadcastsPage() {
  const user = await requireAgencyStaff();

  const [broadcasts, roster, openJobs] = await Promise.all([
    prisma.broadcast.findMany({
      where: { agencyId: user.agencyId },
      include: {
        responses: { include: { model: { include: { user: true } } } },
        job: { select: { id: true, title: true } },
        sender: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.model.findMany({
      where: { agencyId: user.agencyId, status: "ACTIVE" },
      include: { user: { select: { displayName: true, email: true } } },
      orderBy: { user: { displayName: "asc" } },
    }),
    prisma.job.findMany({
      where: { agencyId: user.agencyId, status: { in: ["OPEN", "CONFIRMED"] } },
      orderBy: { startDate: "desc" },
      take: 30,
      select: { id: true, title: true, startDate: true, endDate: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Broadcasts"
        subtitle="Send one message to many models. Aggregate the accept / decline replies."
      />
      <div className="px-8 py-8">
        <BroadcastsClient
          roster={roster.map((m) => ({
            userId: m.userId,
            displayName: m.user.displayName,
            email: m.user.email,
            division: m.division,
          }))}
          jobs={openJobs.map((j) => ({
            id: j.id,
            title: j.title,
            start: j.startDate.toISOString().slice(0, 10),
            end: j.endDate.toISOString().slice(0, 10),
          }))}
          broadcasts={broadcasts.map((b) => ({
            id: b.id,
            body: b.body,
            sentBy: b.sender.displayName,
            sentAt: b.createdAt.toISOString(),
            job: b.job ? { id: b.job.id, title: b.job.title } : null,
            responses: b.responses.map((r) => ({
              modelId: r.modelId,
              modelName: r.model.user.displayName,
              response: r.response,
              respondedAt: r.respondedAt?.toISOString() ?? null,
            })),
          }))}
        />
        {broadcasts.length === 0 && (
          <EmptyState
            icon={<Radio size={20} />}
            title="No broadcasts yet"
            body="Compose your first broadcast above — it replaces the WhatsApp group for castings."
          />
        )}
        <p className="mt-6 text-xs text-ink-subtle">
          Looking for 1:1 threads? <Link href="/agency/messages" className="underline underline-offset-4">Messages</Link>.
        </p>
      </div>
    </div>
  );
}
