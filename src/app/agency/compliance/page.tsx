import Link from "next/link";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { initials } from "@/lib/utils";

export default async function CompliancePage() {
  const user = await requireAgencyStaff();
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 3600 * 1000);

  const docs = await prisma.modelDocument.findMany({
    where: {
      model: { agencyId: user.agencyId },
      expiresAt: { not: null, lte: in90 },
    },
    include: {
      model: { include: { user: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  const expired = docs.filter((d) => d.expiresAt! < now);
  const expiring = docs.filter((d) => d.expiresAt! >= now);

  return (
    <div>
      <PageHeader
        title="Compliance"
        subtitle="Expiring passports, visas, and other docs across your roster."
      />
      <div className="px-8 pb-12 space-y-8">
        <Section
          title="Expired"
          tone="bg-red-50 text-red-800 border-red-100"
          icon={<AlertTriangle size={16} className="text-red-600" />}
          docs={expired}
          empty="Nothing expired. 🎉"
        />
        <Section
          title="Expiring soon (next 90 days)"
          tone="bg-board-option2/30 text-ink border-board-option2"
          icon={<AlertTriangle size={16} className="text-board-option1" />}
          docs={expiring}
          empty="Nothing expires in the next 90 days."
        />
        {docs.length === 0 && (
          <EmptyState
            icon={<ShieldCheck size={20} />}
            title="All clear"
            body="No docs expired or expiring in the next 90 days."
          />
        )}
      </div>
    </div>
  );
}

type DocRow = {
  id: string;
  type: string;
  fileName: string;
  expiresAt: Date | null;
  model: { userId: string; user: { displayName: string } };
};

function Section({
  title,
  tone,
  icon,
  docs,
  empty,
}: {
  title: string;
  tone: string;
  icon: React.ReactNode;
  docs: DocRow[];
  empty: string;
}) {
  return (
    <section>
      <header className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="font-medium">{title}</h2>
        <span className="text-xs text-ink-subtle">({docs.length})</span>
      </header>
      {docs.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className={`ll-card overflow-hidden border ${tone}`}>
          {docs.map((d) => {
            const days = d.expiresAt
              ? Math.ceil((d.expiresAt.getTime() - Date.now()) / (24 * 3600 * 1000))
              : null;
            return (
              <li
                key={d.id}
                className="px-5 py-3 flex items-center gap-4 border-b last:border-0 border-paper-border bg-paper-elevated"
              >
                <Link
                  href={`/agency/models/${d.model.userId}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-soft text-accent text-xs font-medium flex items-center justify-center">
                    {initials(d.model.user.displayName)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {d.model.user.displayName}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {d.type.replace("_", " ").toLowerCase()} · {d.fileName}
                    </div>
                  </div>
                </Link>
                <div className="text-xs text-ink-muted text-right whitespace-nowrap">
                  {d.expiresAt?.toISOString().slice(0, 10)}
                  {days != null && (
                    <div className="text-[11px] text-ink-subtle">
                      {days < 0
                        ? `${-days} day${-days === 1 ? "" : "s"} past`
                        : `in ${days} day${days === 1 ? "" : "s"}`}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
