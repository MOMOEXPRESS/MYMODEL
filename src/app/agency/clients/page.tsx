import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { ClientsClient } from "./clients-client";

export default async function ClientsPage() {
  const user = await requireAgencyStaff();
  const clients = await prisma.client.findMany({
    where: { agencyId: user.agencyId },
    include: {
      jobs: {
        where: { deletedAt: null },
        select: { id: true, title: true, startDate: true, endDate: true, status: true },
        orderBy: { startDate: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Clients"
        title="External clients"
        subtitle="CRM records linked to platform logins — portal, bookings, and briefs in one place."
      />
      <div className="px-8 py-8">
        <ClientsClient
          clients={clients.map((c) => ({
            id: c.id,
            name: c.name,
            companyName: c.companyName,
            email: c.email,
            phone: c.phone,
            subtype: c.subtype,
            platformUserId: c.platformUserId,
            portalEnabled: c.portalEnabled,
            portalToken: c.portalToken,
            portalTokenIssuedAt: c.portalTokenIssuedAt?.toISOString() ?? null,
            jobs: c.jobs.map((j) => ({
              id: j.id,
              title: j.title,
              status: j.status,
              startDate: j.startDate.toISOString().slice(0, 10),
              endDate: j.endDate.toISOString().slice(0, 10),
            })),
          }))}
        />
      </div>
    </div>
  );
}
