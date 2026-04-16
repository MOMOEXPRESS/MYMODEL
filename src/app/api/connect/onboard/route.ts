// POST /api/connect/onboard
// Creates (or reuses) a Stripe Express Connect account for the agency and
// redirects the owner to Stripe's hosted onboarding.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (
    !user ||
    user.role !== "AGENCY_STAFF" ||
    user.agencyMembership?.role !== "OWNER" ||
    !user.agencyId ||
    !user.agency
  ) {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }
  const agency = user.agency;
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  let accountId = agency.stripeAccountId ?? null;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      country: agency.country ?? "FR",
      email: user.email,
      business_profile: { name: agency.name },
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { agencyId: user.agencyId },
    });
    accountId = account.id;
    await prisma.agency.update({
      where: { id: user.agencyId },
      data: { stripeAccountId: accountId },
    });
  }

  const origin = new URL(req.url).origin;
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/agency/billing?connect=refresh`,
    return_url: `${origin}/agency/billing?connect=done`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
