import { prisma } from "@/lib/db";
import { requireModel } from "@/lib/auth-guards";
import { MeasurementsForm } from "@/app/agency/models/[modelId]/measurements-form";
import { PortfolioSection } from "@/app/agency/models/[modelId]/portfolio-section";
import { DocumentsSection } from "@/app/agency/models/[modelId]/documents-section";
import { AvailabilitySection } from "@/app/agency/models/[modelId]/availability-section";

export default async function MyCardPage() {
  const user = await requireModel();
  const model = await prisma.model.findUnique({
    where: { userId: user.id },
    include: {
      portfolio: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" } },
      availability: {
        where: { date: { gte: startOfToday() } },
        orderBy: { date: "asc" },
        take: 120,
      },
    },
  });
  if (!model) return null;

  const measurements = (model.measurements ?? {}) as Record<string, unknown>;

  return (
    <div>
      <h1 className="font-serif text-3xl tracking-tight">My card</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Keep this up to date — your agency uses it every day.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <PortfolioSection modelId={model.userId} portfolio={model.portfolio} />
          <DocumentsSection modelId={model.userId} documents={model.documents} />
          <AvailabilitySection modelId={model.userId} availability={model.availability} />
        </div>
        <div>
          <MeasurementsForm
            modelId={model.userId}
            model={{
              division: model.division,
              status: model.status,
              stageName: model.stageName,
              commissionPercent: model.commissionPercent,
              exclusions: model.exclusions,
              measurements,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function startOfToday(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
