import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { can } from "@/lib/permissions";
import { hasPlanFeature } from "@/lib/plan-guard";
import { packagePublicUrl, packageViewStats } from "@/lib/packages";
import { PageHeader } from "@/components/page-header";
import { PackagesClient } from "./packages-client";
import { modelDisplay } from "@/lib/utils";

export default async function PackagesPage() {
  const user = await requireAgencyStaff();
  if (!can(user.agencyMembership?.role, "package.create") || !hasPlanFeature(user.agency, "packages")) {
    redirect("/agency");
  }

  const [models, packages] = await Promise.all([
    prisma.model.findMany({
      where: { agencyId: user.agencyId, status: "ACTIVE" },
      include: { user: { select: { displayName: true } } },
      orderBy: { user: { displayName: "asc" } },
    }),
    prisma.talentPackage.findMany({
      where: { agencyId: user.agencyId },
      include: { _count: { select: { items: true, views: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const packageRows = await Promise.all(
    packages.map(async (p) => {
      const stats = await packageViewStats(p.id);
      return {
        id: p.id,
        title: p.title,
        url: packagePublicUrl(p.token),
        modelCount: p._count.items,
        viewCount: stats.total,
        lastViewedAt: stats.lastViewedAt?.toISOString() ?? null,
        lastEmailedAt: p.lastEmailedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      };
    }),
  );

  return (
    <div>
      <PageHeader
        eyebrow="Packages"
        title="Talent packages"
        subtitle="Share a polished roster link with clients. Track views and email the link in one click."
      />
      <div className="px-8 py-8">
        <PackagesClient
          roster={models.map((m) => ({
            userId: m.userId,
            displayName: modelDisplay(m),
            division: m.division,
          }))}
          packages={packageRows}
        />
      </div>
    </div>
  );
}
