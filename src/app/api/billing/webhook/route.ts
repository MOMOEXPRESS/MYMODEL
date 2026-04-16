// POST /api/billing/webhook — Stripe webhook handler.
//
// Configure in Stripe → Developers → Webhooks → Add endpoint:
//   URL: https://<your-domain>/api/billing/webhook
//   Events: checkout.session.completed, customer.subscription.*, invoice.*
// Copy the signing secret into STRIPE_WEBHOOK_SECRET on Vercel.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { planFromStripe } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhooks not configured" }, { status: 501 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[stripe-webhook] signature error:", message);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const agencyId = session.metadata?.agencyId;
        if (agencyId && session.subscription) {
          await prisma.agency.update({
            where: { id: agencyId },
            data: {
              stripeSubscriptionId: String(session.subscription),
              stripeCustomerId: String(session.customer ?? ""),
            },
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const agencyId =
          sub.metadata?.agencyId ??
          (await agencyIdFromCustomer(String(sub.customer)));
        if (!agencyId) break;
        const priceId = sub.items.data[0]?.price.id ?? null;
        const plan = planFromStripe(priceId);
        const item = sub.items.data[0];
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null;
        await prisma.agency.update({
          where: { id: agencyId },
          data: {
            stripeSubscriptionId: sub.id,
            stripeCustomerId: String(sub.customer),
            subscriptionStatus: sub.status,
            subscriptionPlan: plan,
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        void periodEnd;
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const agencyId =
          sub.metadata?.agencyId ??
          (await agencyIdFromCustomer(String(sub.customer)));
        if (agencyId) {
          await prisma.agency.update({
            where: { id: agencyId },
            data: {
              subscriptionStatus: "canceled",
              subscriptionPlan: null,
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : null;
        if (customerId) {
          await prisma.agency.updateMany({
            where: { stripeCustomerId: customerId },
            data: { subscriptionStatus: "past_due" },
          });
        }
        break;
      }
      default:
        // Silently accept other events.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function agencyIdFromCustomer(customerId: string): Promise<string | null> {
  const agency = await prisma.agency.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return agency?.id ?? null;
}
