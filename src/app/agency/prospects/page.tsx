import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ProspectsClient } from "./prospects-client";

export default async function ProspectsPage() {
  const user = await requireAgencyStaff();
  const prospects = await prisma.prospect.findMany({
    where: { agencyId: user.agencyId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Scouting"
        subtitle="Track new-talent prospects from spotted to signed."
      />
      <div className="px-8 pb-12">
        <ProspectsClient
          prospects={prospects.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            instagramHandle: p.instagramHandle,
            city: p.city,
            source: p.source,
            notes: p.notes,
            status: p.status,
            imageUrl: p.imageUrl,
            createdAt: p.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
