// Subscription feature gates — complements permissions (role) with plan tier.

import { canUse, type Plan } from "@/lib/plans";

export class PlanLockedError extends Error {
  feature: keyof Plan["features"];
  constructor(feature: keyof Plan["features"]) {
    super(`This feature requires a higher plan (${feature}).`);
    this.name = "PlanLockedError";
    this.feature = feature;
  }
}

type AgencyBilling = {
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
};

export function hasPlanFeature(
  agency: AgencyBilling,
  feature: keyof Plan["features"],
): boolean {
  return canUse({
    plan: agency.subscriptionPlan,
    status: agency.subscriptionStatus,
    feature,
  });
}

export function requirePlanFeature(
  agency: AgencyBilling,
  feature: keyof Plan["features"],
): void {
  if (!hasPlanFeature(agency, feature)) {
    throw new PlanLockedError(feature);
  }
}

export function planError(err: unknown, fallback = "Plan upgrade required"): string {
  return err instanceof PlanLockedError ? err.message : fallback;
}
