import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { statLines } from "@/lib/compcard";
import { CompCardBuilder } from "./compcard-builder";

export default async function CompCardPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const user = await requireAgencyStaff();
  const { modelId } = await params;

  const model = await prisma.model.findUnique({
    where: { userId: modelId },
    include: {
      user: true,
      agency: true,
      portfolio: {
        where: { kind: { in: ["BOOK", "POLAROID"] } },
        orderBy: [{ kind: "asc" }, { order: "asc" }],
      },
    },
  });
  if (!model || model.agencyId !== user.agencyId) notFound();

  const measurements = (model.measurements ?? {}) as Record<string, unknown>;
  const stats = statLines(measurements);

  return (
    <div>
      <div className="px-8 pt-8">
        <Link
          href={`/agency/models/${modelId}`}
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to {model.user.displayName}
        </Link>
      </div>

      <CompCardBuilder
        modelId={modelId}
        modelName={model.user.displayName}
        division={model.division}
        agencyName={model.agency.name}
        agencyCity={model.agency.city}
        agencyLogoUrl={model.agency.logoUrl}
        portfolio={model.portfolio.map((p) => ({
          id: p.id,
          url: p.url,
          kind: p.kind,
        }))}
        stats={stats}
      />
    </div>
  );
}
