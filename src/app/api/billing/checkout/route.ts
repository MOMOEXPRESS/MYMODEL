// POST /api/billing/checkout { plan: "STARTER" | "PRO" | "SCALE" }
// Starts a Stripe Checkout session for the caller's agency.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

const schema = z.object({ plan: z.enum(["STARTER", "PRO", "SCALE"]) });

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
    return NextResponse.json(
      { error: "Stripe not configured. Set STRIPE_SECRET_KEY and the per-plan STRIPE_PRICE_* env vars." },
      { status: 501 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const plan: PlanId = parsed.data.plan;
  const priceId = process.env[PLANS[plan].stripePriceEnv];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing env ${PLANS[plan].stripePriceEnv} for plan ${plan}` },
      { status: 501 },
    );
  }

  // Reuse or create the Customer record.
  let customerId = agency.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email,
      name: agency.name,
      metadata: { agencyId: user.agencyId },
    });
    customerId = customer.id;
    await prisma.agency.update({
      where: { id: user.agencyId },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = new URL(req.url).origin;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { agencyId: user.agencyId, plan },
      trial_period_days: agency.subscriptionStatus ? undefined : 14,
    },
    success_url: `${origin}/agency/settings?billing=success`,
    cancel_url: `${origin}/agency/billing?cancelled=1`,
  });

  return NextResponse.json({ url: session.url });
}
