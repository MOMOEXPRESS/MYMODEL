import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CLIENT_SUBTYPE_LABEL } from "@/lib/client-subtypes";
import { can } from "@/lib/permissions";
import { ClientDetailActions } from "./client-detail-actions";

export default async function AgencyClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const user = await requireAgencyStaff();
  const { clientId } = await params;
  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId: user.agencyId },
    include: {
      platformUser: { select: { id: true, email: true, displayName: true } },
      jobs: {
        where: { deletedAt: null },
        orderBy: { startDate: "desc" },
        take: 12,
        select: { id: true, title: true, status: true, startDate: true, endDate: true },
      },
    },
  });
  if (!client) notFound();

  const role = user.agencyMembership?.role ?? null;
  const portalUrl = client.portalToken
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/client/${client.portalToken}`
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <PageHeader
        eyebrow="Client"
        title={client.companyName ?? client.name}
        subtitle={CLIENT_SUBTYPE_LABEL[client.subtype]}
        actions={
          <Link href="/agency/clients" className="ll-btn-ghost text-xs">
            ← All clients
          </Link>
        }
      />

      <dl className="mt-8 ll-card p-6 grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-ink-subtle text-xs">Contact</dt>
          <dd className="mt-1 font-medium">{client.name}</dd>
        </div>
        <div>
          <dt className="text-ink-subtle text-xs">Email</dt>
          <dd className="mt-1">{client.email}</dd>
        </div>
        {client.phone && (
          <div>
            <dt className="text-ink-subtle text-xs">Phone</dt>
            <dd className="mt-1">{client.phone}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink-subtle text-xs">Platform account</dt>
          <dd className="mt-1">
            {client.platformUser ? (
              <span className="text-emerald-400">
                Linked · {client.platformUser.displayName}
              </span>
            ) : (
              <span className="text-ink-muted">Not linked — matching CLIENT user by email</span>
            )}
          </dd>
        </div>
      </dl>

      {can(role, "client.edit") && (
        <ClientDetailActions
          clientId={client.id}
          portalEnabled={client.portalEnabled}
          portalUrl={portalUrl}
          hasPlatformUser={!!client.platformUser}
        />
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold mb-3">Bookings</h2>
        {client.jobs.length === 0 ? (
          <p className="text-sm text-ink-muted">No jobs yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.jobs.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/agency/bookings/${j.id}`}
                  className="ll-card-interactive block px-4 py-3 text-sm"
                >
                  <span className="font-medium">{j.title}</span>
                  <span className="text-ink-muted ml-2">
                    {j.startDate.toISOString().slice(0, 10)} · {j.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
