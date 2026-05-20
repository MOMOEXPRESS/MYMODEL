// Subscription plans. Source of truth for what each tier includes.
// Prices are monthly, EUR. See brief §12.

export type PlanId = "STARTER" | "PRO" | "SCALE";

export type Plan = {
  id: PlanId;
  label: string;
  priceEur: number;
  maxModels: number;
  maxStaff: number;
  /** Feature gates — cheap way to do per-plan capability. */
  features: {
    compCardPng: boolean;
    invoices: boolean;
    contracts: boolean;
    publicSite: boolean;
    analytics: boolean;
    csvExport: boolean;
    scouting: boolean;
    packages: boolean;
  };
  /** Stripe Price IDs — filled in from env so dev/prod can differ. */
  stripePriceEnv: string;
};

export const PLANS: Record<PlanId, Plan> = {
  STARTER: {
    id: "STARTER",
    label: "Starter",
    priceEur: 199,
    maxModels: 100,
    maxStaff: 3,
    features: {
      compCardPng: true,
      invoices: true,
      contracts: true,
      publicSite: false,
      analytics: false,
      csvExport: false,
      scouting: false,
      packages: true,
    },
    stripePriceEnv: "STRIPE_PRICE_STARTER",
  },
  PRO: {
    id: "PRO",
    label: "Pro",
    priceEur: 399,
    maxModels: 250,
    maxStaff: 10,
    features: {
      compCardPng: true,
      invoices: true,
      contracts: true,
      publicSite: true,
      analytics: true,
      csvExport: true,
      scouting: true,
      packages: true,
    },
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  SCALE: {
    id: "SCALE",
    label: "Scale",
    priceEur: 799,
    maxModels: 500,
    maxStaff: 25,
    features: {
      compCardPng: true,
      invoices: true,
      contracts: true,
      publicSite: true,
      analytics: true,
      csvExport: true,
      scouting: true,
      packages: true,
    },
    stripePriceEnv: "STRIPE_PRICE_SCALE",
  },
};

export function planFromStripe(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  for (const p of Object.values(PLANS)) {
    if (process.env[p.stripePriceEnv] === priceId) return p.id;
  }
  return null;
}

/**
 * Cheap subscription gate. Returns a boolean given the agency's plan state
 * and a feature key. Owners during trial see everything; expired accounts see
 * read-only warnings but aren't locked out of their data (GDPR-friendly).
 */
export function canUse(opts: {
  plan: string | null;
  status: string | null;
  feature: keyof Plan["features"];
}): boolean {
  if (!opts.plan) return true; // pre-billing grace — existing agencies keep working
  if (opts.status === "canceled" || opts.status === "unpaid") return false;
  const plan = PLANS[opts.plan as PlanId];
  if (!plan) return true;
  return plan.features[opts.feature];
}

export function planLimits(planId: string | null): Pick<Plan, "maxModels" | "maxStaff"> {
  if (!planId || !(planId in PLANS)) return { maxModels: 9999, maxStaff: 9999 };
  const p = PLANS[planId as PlanId];
  return { maxModels: p.maxModels, maxStaff: p.maxStaff };
}
