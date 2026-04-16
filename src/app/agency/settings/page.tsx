import { requireAgencyStaff } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AgencyProfileForm } from "./agency-profile-form";
import { TeamSection } from "./team-section";
import { CopyInviteClient } from "./copy-invite";
import { PrivacySection } from "@/components/privacy-section";

export default async function SettingsPage() {
  const user = await requireAgencyStaff();

  const [members, invites] = await Promise.all([
    prisma.agencyMember.findMany({
      where: { agencyId: user.agencyId },
      include: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.teamInvite.findMany({
      where: { agencyId: user.agencyId, consumedAt: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const isOwner = user.agencyMembership?.role === "OWNER";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Agency profile, billing, team, and signup code." />
      <div className="px-8 pb-12 max-w-3xl space-y-6">
        <section className="ll-card p-6">
          <h2 className="font-medium">Agency signup code</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Share this with any model you&apos;ve signed. They&apos;ll land on the signup
            form with it prefilled.
          </p>
          <div className="mt-4 p-4 bg-paper rounded-lg border border-paper-border font-mono tracking-widest text-center text-xl">
            {user.agency.signupCode}
          </div>
          <CopyInviteClient code={user.agency.signupCode} />
        </section>

        <AgencyProfileForm
          agency={{
            id: user.agency.id,
            name: user.agency.name,
            city: user.agency.city ?? "",
            country: user.agency.country ?? "FR",
            currency: user.agency.currency,
            defaultCommissionPercent: user.agency.defaultCommissionPercent,
            legalName: user.agency.legalName ?? "",
            addressLine: user.agency.addressLine ?? "",
            postalCode: user.agency.postalCode ?? "",
            siret: user.agency.siret ?? "",
            vatNumber: user.agency.vatNumber ?? "",
            iban: user.agency.iban ?? "",
            bic: user.agency.bic ?? "",
            publicSiteEnabled: user.agency.publicSiteEnabled,
          }}
          readOnly={!isOwner}
        />

        <TeamSection
          members={members.map((m) => ({
            userId: m.userId,
            name: m.user.displayName,
            email: m.user.email,
            role: m.role,
          }))}
          invites={invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            token: i.token,
            expiresAt: i.expiresAt?.toISOString() ?? null,
          }))}
          meUserId={user.id}
          canManage={isOwner}
        />

        <PrivacySection />
      </div>
    </div>
  );
}
