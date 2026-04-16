// POST /api/billing/portal → returns a Stripe Customer Portal URL so the
// owner can change plan, update payment method, download receipts, cancel.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "AGENCY_STAFF" || user.agencyMembership?.role !== "OWNER" || !user.agency) {
    return NextResponse.json({ error: "Owner only" }, { status: 403 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }
  if (!user.agency.stripeCustomerId) {
    return NextResponse.json({ error: "No subscription to manage yet" }, { status: 400 });
  }
  const origin = new URL(req.url).origin;
  const session = await stripe().billingPortal.sessions.create({
    customer: user.agency.stripeCustomerId,
    return_url: `${origin}/agency/settings?billing=returned`,
  });
  return NextResponse.json({ url: session.url });
}
