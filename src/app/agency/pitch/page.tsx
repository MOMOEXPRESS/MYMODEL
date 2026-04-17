import { prisma } from "@/lib/db";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { PitchDeckClient } from "./pitch-client";

export default async function PitchDeckPage() {
  const user = await requireAgencyStaff();
  const roster = await prisma.model.findMany({
    where: { agencyId: user.agencyId, status: "ACTIVE" },
    include: {
      user: { select: { displayName: true } },
    },
    orderBy: { user: { displayName: "asc" } },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Pitch deck"
        title="Submit a selection"
        subtitle="Pick models, give the deck a title, export a PDF to send to a casting director."
      />
      <div className="px-8 py-8">
        <PitchDeckClient
          roster={roster.map((m) => ({
            userId: m.userId,
            displayName: m.user.displayName,
            division: m.division,
          }))}
        />
      </div>
    </div>
  );
}
