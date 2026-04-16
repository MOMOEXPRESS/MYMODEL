// Role-based permissions.
//
// Every AgencyMember has a role (OWNER / BOOKER / PRODUCTION / ACCOUNTS).
// `can(role, action)` is the single gate every sensitive server action calls.
// The UI also uses it to hide buttons a user can't act on.
//
// Design: we enumerate concrete Actions, not CRUD verbs, so the matrix
// reads well and each new capability is a deliberate addition.

import { AgencyMemberRole } from "@prisma/client";

export type Action =
  // Roster / models
  | "model.edit"
  | "model.delete"
  // Jobs
  | "job.create"
  | "job.edit"
  | "job.delete"
  | "job.status_change"
  // Assignments
  | "assignment.create"
  | "assignment.edit"
  | "assignment.delete"
  // Room
  | "room.edit"
  // Broadcasts
  | "broadcast.send"
  // Messages
  | "message.send"
  // Invoices
  | "invoice.create"
  | "invoice.edit"
  | "invoice.delete"
  | "invoice.mark_paid"
  | "invoice.export"
  // Payouts
  | "payout.mark_paid"
  // Contracts
  | "contract.create"
  | "contract.send"
  | "contract.delete"
  // Prospects
  | "prospect.edit"
  // Travel
  | "travel.edit"
  // Team / agency
  | "agency.edit_profile"
  | "agency.manage_team"
  | "agency.billing"
  | "agency.connect"
  // Compliance / activity
  | "compliance.view"
  | "activity.view"
  | "analytics.view";

type Matrix = Record<AgencyMemberRole, Set<Action>>;

function make(list: Action[]): Set<Action> {
  return new Set(list);
}

// OWNER is the superset — everything.
const ALL: Action[] = [
  "model.edit",
  "model.delete",
  "job.create",
  "job.edit",
  "job.delete",
  "job.status_change",
  "assignment.create",
  "assignment.edit",
  "assignment.delete",
  "room.edit",
  "broadcast.send",
  "message.send",
  "invoice.create",
  "invoice.edit",
  "invoice.delete",
  "invoice.mark_paid",
  "invoice.export",
  "payout.mark_paid",
  "contract.create",
  "contract.send",
  "contract.delete",
  "prospect.edit",
  "travel.edit",
  "agency.edit_profile",
  "agency.manage_team",
  "agency.billing",
  "agency.connect",
  "compliance.view",
  "activity.view",
  "analytics.view",
];

const MATRIX: Matrix = {
  OWNER: make(ALL),
  BOOKER: make([
    "model.edit",
    "job.create",
    "job.edit",
    "job.delete",
    "job.status_change",
    "assignment.create",
    "assignment.edit",
    "assignment.delete",
    "room.edit",
    "broadcast.send",
    "message.send",
    "contract.create",
    "contract.send",
    "prospect.edit",
    "travel.edit",
    "compliance.view",
    "activity.view",
    "analytics.view",
  ]),
  PRODUCTION: make([
    "model.edit",
    "job.edit",
    "assignment.edit",
    "room.edit",
    "message.send",
    "travel.edit",
    "compliance.view",
  ]),
  ACCOUNTS: make([
    "invoice.create",
    "invoice.edit",
    "invoice.delete",
    "invoice.mark_paid",
    "invoice.export",
    "payout.mark_paid",
    "contract.create",
    "contract.send",
    "activity.view",
    "analytics.view",
    "agency.billing",
  ]),
};

export function can(role: AgencyMemberRole | undefined | null, action: Action): boolean {
  if (!role) return false;
  return MATRIX[role].has(action);
}

/** Throws a typed error if the current role can't do the action. Use in server actions. */
export class ForbiddenError extends Error {
  action: Action;
  role: AgencyMemberRole | null;
  constructor(action: Action, role: AgencyMemberRole | null) {
    super(`Your role (${role ?? "none"}) can't ${action}.`);
    this.name = "ForbiddenError";
    this.action = action;
    this.role = role;
  }
}

export function requireCan(
  role: AgencyMemberRole | undefined | null,
  action: Action,
): void {
  if (!can(role, action)) {
    throw new ForbiddenError(action, role ?? null);
  }
}
