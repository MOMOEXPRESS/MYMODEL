// Stripe client singleton. Lazy — same pattern as env.ts so the build doesn't
// need keys.

import Stripe from "stripe";

let _client: Stripe | null = null;

export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Stripe not configured — set STRIPE_SECRET_KEY in the Vercel environment.",
    );
  }
  _client = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  return _client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
