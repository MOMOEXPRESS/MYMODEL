import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, MessageSquare, Receipt, FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { initials } from "@/lib/utils";
import { MeasurementsForm } from "./measurements-form";
import { PortfolioSection } from "./portfolio-section";
import { DocumentsSection } from "./documents-section";
import { AvailabilitySection } from "./availability-section";

export default async function ModelDetailPage({
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
      portfolio: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" } },
      availability: {
        where: { date: { gte: startOfToday() } },
        orderBy: { date: "asc" },
        take: 120,
      },
    },
  });

  if (!model || model.agencyId !== user.agencyId) notFound();

  const measurements = (model.measurements ?? {}) as Record<string, unknown>;

  return (
    <div>
      <div className="px-8 pt-8">
        <Link
          href="/agency/roster"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Back to roster
        </Link>
      </div>

      {/* Header card */}
      <header className="px-8 pt-6 pb-8 border-b border-paper-border">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-accent-soft text-accent text-2xl font-medium flex items-center justify-center shrink-0">
            {initials(model.user.displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h1 className="font-serif text-3xl tracking-tight">{model.user.displayName}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/agency/messages/${model.userId}`}
                  className="ll-btn-secondary"
                >
                  <MessageSquare size={14} /> Message
                </Link>
                <Link
                  href={`/agency/models/${model.userId}/compcard`}
                  className="ll-btn-secondary"
                >
                  <FileDown size={14} /> Comp card
                </Link>
                <Link
                  href={`/agency/models/${model.userId}/tearsheets`}
                  className="ll-btn-secondary"
                >
                  <FileText size={14} /> Tear sheets
                </Link>
                <a
                  href={`/api/earnings/${model.userId}/pdf?year=${new Date().getUTCFullYear()}&month=${
                    new Date().getUTCMonth() + 1
                  }`}
                  target="_blank"
                  rel="noreferrer"
                  className="ll-btn-secondary"
                >
                  <Receipt size={14} /> Earnings
                </a>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
              <span>{model.division.replace("_", " ")}</span>
              <StatusDot status={model.status} />
              {model.user.email && <span>· {model.user.email}</span>}
              {model.user.phone && <span>· {model.user.phone}</span>}
            </div>
            {model.exclusions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {model.exclusions.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-paper border border-paper-border text-ink-muted"
                  >
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-8 py-8 grid gap-8 lg:grid-cols-3">
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
              baseCity: model.baseCity,
              motherAgencyName: model.motherAgencyName,
              motherAgencyCommissionPercent: model.motherAgencyCommissionPercent,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: "ACTIVE" | "ON_LEAVE" | "INACTIVE" }) {
  const color =
    status === "ACTIVE"
      ? "bg-board-confirmed"
      : status === "ON_LEAVE"
        ? "bg-board-option1"
        : "bg-ink-subtle";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {status.replace("_", " ").toLowerCase()}
    </span>
  );
}

function startOfToday(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
