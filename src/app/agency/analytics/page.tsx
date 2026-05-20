import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, Award, Clock, Briefcase } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { hasPlanFeature } from "@/lib/plan-guard";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { initials } from "@/lib/utils";

export default async function AnalyticsPage() {
  const user = await requireAgencyStaff();
  if (!can(user.agencyMembership?.role, "analytics.view") || !hasPlanFeature(user.agency, "analytics")) {
    redirect("/agency");
  }

  // Last 6 months by invoice.paidAt
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 6);
  since.setUTCDate(1);

  const [paidInvoices, completedAssignments, activeModels, openJobs, allAssignments] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { agencyId: user.agencyId, status: "PAID", paidAt: { gte: since } },
      }),
      prisma.jobAssignment.findMany({
        where: {
          modelId: { not: undefined },
          status: "DONE",
          job: { agencyId: user.agencyId },
        },
        include: {
          job: { select: { defaultRate: true, startDate: true, endDate: true, rateType: true } },
          model: { include: { user: { select: { displayName: true } } } },
        },
      }),
      prisma.model.findMany({
        where: { agencyId: user.agencyId, status: "ACTIVE" },
        include: { user: { select: { displayName: true } } },
      }),
      prisma.job.findMany({
        where: {
          agencyId: user.agencyId,
          status: { in: ["OPEN", "CONFIRMED"] },
          startDate: { gte: since },
        },
      }),
      prisma.jobAssignment.findMany({
        where: { job: { agencyId: user.agencyId } },
      }),
    ]);

  // Monthly revenue (last 6)
  const months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - (5 - i));
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      key: d.getUTCFullYear() * 100 + d.getUTCMonth(),
      amount: 0,
    };
  });
  for (const i of paidInvoices) {
    if (!i.paidAt) continue;
    const key = i.paidAt.getUTCFullYear() * 100 + i.paidAt.getUTCMonth();
    const m = months.find((m) => m.key === key);
    if (m) m.amount += i.total;
  }
  const maxRev = Math.max(1, ...months.map((m) => m.amount));

  // Per-model gross
  const perModel = new Map<string, { name: string; total: number; jobs: number }>();
  for (const a of completedAssignments) {
    const rate = a.rate ?? a.job.defaultRate ?? 0;
    const days = Math.max(
      1,
      Math.round((a.job.endDate.getTime() - a.job.startDate.getTime()) / 86400000) + 1,
    );
    const rt = a.rateType ?? a.job.rateType;
    const total = rate * (rt === "DAY" ? days : 1);
    const existing = perModel.get(a.modelId) ?? {
      name: a.model.user.displayName,
      total: 0,
      jobs: 0,
    };
    existing.total += total;
    existing.jobs += 1;
    perModel.set(a.modelId, existing);
  }
  const topModels = Array.from(perModel.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Conversion: option → confirmed
  const totalOptions = allAssignments.filter((a) =>
    ["OPTION_1", "OPTION_2", "OPTION_3", "CONFIRMED", "DONE"].includes(a.status),
  ).length;
  const confirmedCount = allAssignments.filter((a) =>
    ["CONFIRMED", "DONE"].includes(a.status),
  ).length;
  const optionToConfirm = totalOptions === 0 ? 0 : Math.round((confirmedCount / totalOptions) * 100);

  // Under-used models: 0 DONE jobs in 90 days
  const ninetyAgo = new Date();
  ninetyAgo.setUTCDate(ninetyAgo.getUTCDate() - 90);
  const recentDone = await prisma.jobAssignment.groupBy({
    by: ["modelId"],
    where: {
      status: "DONE",
      job: { agencyId: user.agencyId, endDate: { gte: ninetyAgo } },
    },
  });
  const recentSet = new Set(recentDone.map((r) => r.modelId));
  const underused = activeModels.filter((m) => !recentSet.has(m.userId));

  const currency = user.agency.currency;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Revenue trends, top earners, who's underused. Last six months."
      />
      <div className="px-8 pb-12 space-y-8">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            label="Revenue (6mo)"
            value={`${currency} ${months.reduce((s, m) => s + m.amount, 0).toFixed(0)}`}
            icon={<TrendingUp size={14} />}
          />
          <Kpi
            label="Paid invoices"
            value={paidInvoices.length}
            icon={<Briefcase size={14} />}
          />
          <Kpi
            label="Open jobs"
            value={openJobs.length}
            icon={<Clock size={14} />}
          />
          <Kpi
            label="Option → Confirm"
            value={`${optionToConfirm}%`}
            icon={<Award size={14} />}
          />
        </div>

        {/* Revenue bars */}
        <section className="ll-card p-6">
          <h2 className="font-medium">Revenue by month</h2>
          <div className="mt-6 flex items-end gap-3 h-40">
            {months.map((m) => (
              <div key={m.key} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full rounded-t bg-ink"
                  style={{
                    height: `${(m.amount / maxRev) * 100}%`,
                    minHeight: m.amount > 0 ? "4px" : "1px",
                  }}
                  title={`${currency} ${m.amount.toFixed(0)}`}
                />
                <div className="text-[11px] text-ink-subtle mt-2">{m.label}</div>
                <div className="text-[10px] text-ink-subtle">
                  {m.amount > 0 ? `${currency} ${m.amount.toFixed(0)}` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top models */}
        <section className="ll-card p-6">
          <h2 className="font-medium">Top earners</h2>
          {topModels.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              No completed jobs yet — as assignments flip to DONE, they&apos;ll aggregate here.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-paper-border">
              {topModels.map((m) => (
                <li key={m.id} className="py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
                    {initials(m.name)}
                  </div>
                  <Link
                    href={`/agency/models/${m.id}`}
                    className="flex-1 min-w-0 group"
                  >
                    <div className="font-medium text-sm group-hover:underline underline-offset-4">
                      {m.name}
                    </div>
                    <div className="text-xs text-ink-muted">{m.jobs} completed jobs</div>
                  </Link>
                  <div className="font-medium text-sm">
                    {currency} {m.total.toFixed(0)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Under-used */}
        <section className="ll-card p-6">
          <h2 className="font-medium">Underused models</h2>
          <p className="text-xs text-ink-subtle mt-1">
            Active roster with no DONE jobs in the last 90 days — worth a nudge.
          </p>
          {underused.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Everyone&apos;s working. Nice.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {underused.slice(0, 30).map((m) => (
                <Link
                  key={m.userId}
                  href={`/agency/models/${m.userId}`}
                  className="px-3 py-1.5 rounded-full border border-paper-border text-xs hover:bg-paper"
                >
                  {m.user.displayName}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="ll-card p-5">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-subtle">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl tracking-tight">{value}</div>
    </div>
  );
}
