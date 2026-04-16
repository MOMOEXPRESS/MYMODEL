// GET /scouted/[code] — public self-submit form for spotted talent.
//
// Purpose: at open castings the agency hands out a QR / short code. Whoever
// scans it lands here and fills a form. Submission creates a Prospect (NOT
// a full Model / User). The agency triages them in /agency/prospects and,
// if signed, converts to a real Model.

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ScoutedForm } from "./scouted-form";

export const metadata = { title: "Get spotted · LuxLane" };

export default async function ScoutedPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const agency = await prisma.agency.findUnique({
    where: { signupCode: code.toUpperCase() },
    select: { name: true, city: true, signupCode: true, logoUrl: true },
  });
  if (!agency) notFound();

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-lg px-6 py-10">
        <Link href="/" className="text-sm text-ink-muted">&larr; LuxLane</Link>

        <div className="mt-8 ll-card p-6 bg-paper-elevated">
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
            Scouting {agency.city ? `· ${agency.city}` : ""}
          </div>
          <h1 className="mt-2 font-serif text-3xl tracking-tight">
            Spotted by {agency.name}?
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Leave your details and a photo. A booker at {agency.name} will
            review and get in touch. This isn&apos;t a model account yet —
            you&apos;re in the scouting shortlist until the agency signs you.
          </p>

          <ScoutedForm code={agency.signupCode} agencyName={agency.name} />
        </div>

        <p className="mt-6 text-[11px] text-ink-subtle text-center">
          By submitting, you consent to {agency.name} storing your details for
          the purpose of considering you for representation. You can request
          deletion at any time by emailing {agency.name.toLowerCase().replace(/\s+/g, ".")}@luxlane.app.
        </p>
      </div>
    </main>
  );
}
