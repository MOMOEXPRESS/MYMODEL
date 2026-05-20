export type RuleSection = {
  slug: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const RULE_SECTIONS: RuleSection[] = [
  {
    slug: "permissions",
    title: "Staff permissions",
    summary: "What each agency role can do in LuxLane.",
    bullets: [
      "Owner — full access including billing, team, and agency profile.",
      "Booker — jobs, roster, clients, packages, scouting, contracts (create/send), analytics.",
      "Production — edit jobs and assignments, job rooms, travel; cannot create jobs or invoices.",
      "Accounts — invoices, payouts, contracts, billing; no board or roster edits.",
      "Every button is gated in the UI and enforced again on the server.",
    ],
  },
  {
    slug: "plans",
    title: "Subscription plans",
    summary: "Starter, Pro, and Scale feature gates.",
    bullets: [
      "Packages — shareable talent links (all tiers).",
      "Scouting & castings — Pro and Scale.",
      "Public roster site — Pro and Scale.",
      "Analytics & CSV export — Pro and Scale.",
      "Expired subscriptions stay read-only; data is never deleted.",
    ],
  },
  {
    slug: "holds",
    title: "Schedule & holds",
    summary: "How availability and booking holds appear on the schedule.",
    bullets: [
      "Available — open for bookings.",
      "On hold — model is held for a job (1st / 2nd / 3rd priority in hold-detail mode).",
      "Booked — confirmed and locked.",
      "On set — confirmed job happening that day.",
      "Away — unavailable or traveling (manual block).",
      "Holds sync from assignment status; confirming a model updates the board.",
    ],
  },
  {
    slug: "bookings",
    title: "Bookings pipeline",
    summary: "Job stages and assignment states.",
    bullets: [
      "Job stages: Draft → Open → Confirmed → On set → Wrapped.",
      "Assignments: Proposed → On hold (priority) → Confirmed → Done, or Declined / Released.",
      "Confirming checks date conflicts and optional exclusivity category.",
      "Confirmed jobs get a job room (files, schedule, chat).",
    ],
  },
  {
    slug: "client-portal",
    title: "Client access",
    summary: "Magic links, platform accounts, and approvals.",
    bullets: [
      "Agency clients can use a passwordless portal link or a LuxLane login when linked by email.",
      "Clients see only their jobs and can approve or flag models on the lineup.",
      "Reactions notify the job owner; bookers decide next steps (not auto-confirmed).",
      "Talent packages are separate marketing links with view counts.",
    ],
  },
  {
    slug: "platform",
    title: "Network & events",
    summary: "Cross-role collaboration outside a single agency tenant.",
    bullets: [
      "Any platform user can connect via Network (pending → accepted).",
      "Group events can be hosted by clients, creatives, models, or staff.",
      "Events may link to an agency booking when the host is agency staff.",
      "Briefs from clients route to a chosen agency and can become a booking.",
    ],
  },
  {
    slug: "billing",
    title: "Money & legal",
    summary: "Invoices, payouts, and contracts.",
    bullets: [
      "Invoices can be created from wrapped jobs (plan-gated).",
      "Marking paid can spawn model payout rows.",
      "Contracts use e-sign tokens; signed PDFs are stored on the job.",
      "Accounts role owns most money surfaces; bookers can create/send contracts.",
    ],
  },
];

export function ruleBySlug(slug: string): RuleSection | undefined {
  return RULE_SECTIONS.find((r) => r.slug === slug);
}
