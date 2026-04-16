import { Trash2, Undo2 } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { TrashRowActions } from "./trash-row-actions";

export default async function TrashPage() {
  const user = await requireAgencyStaff();

  const [jobs, invoices, contracts] = await Promise.all([
    prisma.job.findMany({
      where: { agencyId: user.agencyId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { agencyId: user.agencyId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.contract.findMany({
      where: { agencyId: user.agencyId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  const total = jobs.length + invoices.length + contracts.length;

  return (
    <div>
      <PageHeader
        eyebrow="Safety net"
        title="Trash"
        subtitle="Deleted items live here for 30 days. Restore them any time, or wipe permanently."
        stats={[
          { label: "Jobs", value: jobs.length },
          { label: "Invoices", value: invoices.length },
          { label: "Contracts", value: contracts.length },
        ]}
      />
      <div className="px-8 py-8 space-y-8">
        {total === 0 && (
          <EmptyState
            icon={<Trash2 size={20} />}
            title="Trash is empty"
            body="Jobs, invoices and contracts you delete will sit here for 30 days before the nightly purge removes them for good."
          />
        )}

        {jobs.length > 0 && (
          <Section title="Jobs">
            {jobs.map((j) => (
              <Row
                key={j.id}
                title={j.title}
                subtitle={`${j.type.toLowerCase()} · deleted ${j.deletedAt!.toLocaleDateString()}`}
                kind="job"
                id={j.id}
              />
            ))}
          </Section>
        )}

        {invoices.length > 0 && (
          <Section title="Invoices">
            {invoices.map((i) => (
              <Row
                key={i.id}
                title={i.number}
                subtitle={`${i.clientName} · deleted ${i.deletedAt!.toLocaleDateString()}`}
                kind="invoice"
                id={i.id}
              />
            ))}
          </Section>
        )}

        {contracts.length > 0 && (
          <Section title="Contracts">
            {contracts.map((c) => (
              <Row
                key={c.id}
                title={c.title}
                subtitle={`${c.kind.replace("_", " ").toLowerCase()} · deleted ${c.deletedAt!.toLocaleDateString()}`}
                kind="contract"
                id={c.id}
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-medium mb-3">{title}</h2>
      <ul className="ll-card overflow-hidden divide-y divide-paper-border">{children}</ul>
    </section>
  );
}

function Row({
  title,
  subtitle,
  kind,
  id,
}: {
  title: string;
  subtitle: string;
  kind: "job" | "invoice" | "contract";
  id: string;
}) {
  return (
    <li className="px-5 py-3 flex items-center gap-3 text-sm">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        <div className="text-xs text-ink-muted truncate">{subtitle}</div>
      </div>
      <TrashRowActions kind={kind} id={id} />
    </li>
  );
}
