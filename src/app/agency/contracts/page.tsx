import { FilePenLine } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ContractsClient } from "./contracts-client";

export default async function ContractsPage() {
  const user = await requireAgencyStaff();

  const [contracts, models, jobs] = await Promise.all([
    prisma.contract.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.model.findMany({
      where: { agencyId: user.agencyId },
      include: { user: { select: { displayName: true } } },
      orderBy: { user: { displayName: "asc" } },
    }),
    prisma.job.findMany({
      where: { agencyId: user.agencyId },
      orderBy: { startDate: "desc" },
      take: 50,
      select: { id: true, title: true },
    }),
  ]);

  // Resolve displayed model/job labels
  const modelMap = new Map(models.map((m) => [m.userId, m.user.displayName]));
  const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

  return (
    <div>
      <PageHeader
        title="Contracts"
        subtitle="Upload, send for signature, and track model/client/booking agreements."
      />
      <div className="px-8 pb-12">
        <ContractsClient
          models={models.map((m) => ({ userId: m.userId, name: m.user.displayName }))}
          jobs={jobs}
          contracts={contracts.map((c) => ({
            id: c.id,
            title: c.title,
            kind: c.kind,
            status: c.status,
            modelName: c.modelId ? modelMap.get(c.modelId) ?? null : null,
            jobTitle: c.jobId ? jobMap.get(c.jobId) ?? null : null,
            fileUrl: c.fileUrl,
            sigToken: c.sigToken,
            sentAt: c.sentAt?.toISOString() ?? null,
            signedAt: c.signedAt?.toISOString() ?? null,
            signedName: c.signedName,
          }))}
        />
        {contracts.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={<FilePenLine size={20} />}
              title="No contracts yet"
              body="Upload a contract PDF, pick the model it's for, send it — they sign in-app with one click."
            />
          </div>
        )}
      </div>
    </div>
  );
}
