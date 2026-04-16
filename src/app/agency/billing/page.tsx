import { CheckCircle2, Banknote } from "lucide-react";
import { requireAgencyStaff } from "@/lib/auth-guards";
import { PageHeader } from "@/components/page-header";
import { PLANS } from "@/lib/plans";
import { BillingActions } from "./billing-actions";
import { ConnectCTA } from "./connect-cta";

export default async function BillingPage() {
  const user = await requireAgencyStaff();
  const isOwner = user.agencyMembership?.role === "OWNER";
  const currentPlan = user.agency.subscriptionPlan ?? null;
  const status = user.agency.subscriptionStatus ?? null;

  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle={
          currentPlan
            ? `Currently on ${currentPlan} · ${status}`
            : "Pick a plan to unlock everything. Fourteen days free."
        }
      />
      <div className="px-8 pb-12">
        {!isOwner && (
          <p className="text-sm text-ink-muted mb-6">
            Only the agency owner can change the plan.
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(PLANS).map((p) => {
            const isCurrent = currentPlan === p.id;
            return (
              <div
                key={p.id}
                className={
                  isCurrent
                    ? "ll-card p-6 ring-2 ring-accent"
                    : "ll-card p-6"
                }
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-2xl">{p.label}</h3>
                  {isCurrent && (
                    <span className="text-[10px] uppercase tracking-wider text-accent">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <span className="font-serif text-3xl">€{p.priceEur}</span>
                  <span className="text-sm text-ink-muted"> /month</span>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Up to {p.maxModels} models · {p.maxStaff} staff seats
                </p>

                <ul className="mt-5 space-y-1.5 text-sm">
                  <Feature label="Roster + Board + Jobs" on />
                  <Feature label="Messaging + Broadcasts" on />
                  <Feature label="Comp cards (PDF + PNG)" on={p.features.compCardPng} />
                  <Feature label="Invoices + French fields" on={p.features.invoices} />
                  <Feature label="Contracts + e-signature" on={p.features.contracts} />
                  <Feature label="Public roster site" on={p.features.publicSite} />
                  <Feature label="Analytics" on={p.features.analytics} />
                  <Feature label="Pennylane / QuickBooks export" on={p.features.csvExport} />
                  <Feature label="Scouting pipeline" on={p.features.scouting} />
                </ul>

                <div className="mt-6">
                  <BillingActions
                    planId={p.id}
                    isCurrent={isCurrent}
                    canManage={isOwner}
                    hasCustomer={Boolean(user.agency.stripeCustomerId)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-10 ll-card p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Banknote size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">Pay models directly with Stripe Connect</h3>
              <p className="text-sm text-ink-muted mt-1">
                Connect a Stripe account and LuxLane can transfer each model&apos;s
                net share automatically when their invoice is paid. Until you
                connect, payouts are tracked but settled manually via your bank.
              </p>
              <div className="mt-3 text-xs text-ink-subtle">
                {user.agency.stripeAccountId
                  ? `Connected account: ${user.agency.stripeAccountId.slice(0, 16)}…`
                  : "Not connected yet."}
              </div>
            </div>
            <ConnectCTA connected={Boolean(user.agency.stripeAccountId)} canManage={isOwner} />
          </div>
        </section>

        <p className="mt-6 text-xs text-ink-subtle">
          Powered by Stripe. 14-day free trial, cancel any time. Prices exclude VAT.
        </p>
      </div>
    </div>
  );
}

function Feature({ label, on }: { label: string; on: boolean }) {
  return (
    <li
      className={
        on
          ? "flex items-start gap-1.5"
          : "flex items-start gap-1.5 text-ink-subtle line-through"
      }
    >
      <CheckCircle2
        size={14}
        className={on ? "text-board-confirmed mt-0.5 shrink-0" : "text-paper-border mt-0.5 shrink-0"}
      />
      {label}
    </li>
  );
}
