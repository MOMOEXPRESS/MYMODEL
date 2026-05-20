# LuxLane — Actor workflows & consistency map

This document lists **every actor type**, what they can do, and how actions flow through the app. Use it when adding features so permissions, plans, and UI stay aligned.

## Actor types

| Actor | Auth | Primary surfaces |
|-------|------|------------------|
| **Agency OWNER** | Email + password → JWT cookie | `/agency/*` (full access) |
| **Agency BOOKER** | Same | Jobs, roster, board, packages, clients, scouting |
| **Agency PRODUCTION** | Same | Job rooms, travel, model edits (limited), messages |
| **Agency ACCOUNTS** | Same | Invoices, payouts, contracts, billing |
| **Model** | Email + password | `/m/*` |
| **Client (portal)** | Magic link token in URL | `/client/[token]/*` |
| **Client (platform)** | Email + password | `/c/*` (bookings, briefs, agencies) |
| **Contract signatory** | Signing token | `/sign/[token]` |
| **Scout / prospect** | Public scouting code | `/scouted/[code]` |
| **Casting walk-in** | Public casting code | `/casting/[code]` |
| **Package viewer** | Public package token (+ optional password) | `/package/[token]` |
| **Public visitor** | None | `/`, `/a/[code]`, legal pages |

Staff roles are enforced server-side via `requireAgencyStaffCan(action)` in `src/lib/staff.ts` and `src/lib/permissions.ts`. Subscription features use `requirePlanFeature` in `src/lib/plan-guard.ts`.

---

## 1. Agency OWNER

### Onboarding & billing
| Action | Route / handler | Permission | Plan |
|--------|-----------------|------------|------|
| Sign up agency | `POST /api/auth/signup-agency` | — | — |
| Edit agency profile & public site toggle | `updateAgencyProfile` | `agency.edit_profile` | `publicSite` if enabling site |
| Invite team | `createTeamInvite` | `agency.manage_team` | — |
| Remove member / delete invite | `removeTeamMember`, `deleteTeamInvite` | `agency.manage_team` | — |
| Stripe checkout / portal | `/api/billing/*` | `agency.billing` | — |

### Roster & models
| Action | Handler | Permission |
|--------|---------|------------|
| View roster | `/agency/roster` | any staff |
| Edit model card, uploads, availability | `models/[modelId]/actions` | `model.edit` |
| Comp card PDF/PNG | `/api/compcard/*` | `model.edit` |
| Compliance dashboard | `/agency/compliance` | `compliance.view` |

### Board & jobs
| Action | Handler | Permission |
|--------|---------|------------|
| View board | `/agency/board`, `GET /api/board` | any staff |
| Bulk / cell availability | `PATCH /api/board/cell` | `model.edit` |
| Create / edit / delete job | `jobs/actions` | `job.create` / `job.edit` / `job.delete` |
| Change job status | `setJobStatus` | `job.status_change` |
| Attach / update / remove assignments | `jobs/actions` | `assignment.*` |
| Job room files, schedule, chat | `room-actions` | staff: `room.edit`; model: chat read-only for files/schedule |
| Travel items | `travel-actions` | `travel.edit` |

### Client-facing
| Action | Handler | Permission | Plan |
|--------|---------|------------|------|
| CRUD clients & portal tokens | `clients/actions` | `client.edit` | — |
| **Talent packages** (link + views + email) | `packages/actions` | `package.create` / `package.send` | `packages` |
| Pitch deck PDF | `POST /api/pitch-deck` | `package.create` (same bookers) | — |
| Client portal (job approvals) | `/client/[token]` | token | — |

### Scouting & castings
| Action | Handler | Permission | Plan |
|--------|---------|------------|------|
| Prospects kanban | `prospects/actions` | `prospect.edit` | `scouting` |
| Casting events | `castings/actions` | `prospect.edit` | `scouting` |

### Money & legal
| Action | Handler | Permission | Plan |
|--------|---------|------------|------|
| Invoices | `invoices/actions` | `invoice.*` | `invoices` |
| CSV export | `GET /api/invoices/export.csv` | `invoice.export` | `csvExport` |
| Payouts | `payouts/actions` | `payout.mark_paid` | — |
| Contracts & e-sign send | `contracts/actions` | `contract.*` | `contracts` |
| Analytics | `/agency/analytics` | `analytics.view` | `analytics` |

### Comms
| Action | Handler | Permission |
|--------|---------|------------|
| DM threads | `/api/conversations/*` | `message.send` |
| Broadcasts | `broadcasts/actions` | `broadcast.send` |

### Ops
| Action | Handler | Permission |
|--------|---------|------------|
| Activity log | `/agency/activity` | `activity.view` |
| Trash restore / purge | `trash/actions` | entity-specific delete perms |

**Flow example — booking a job:**  
`Create job` → `Attach models` (PROPOSED) → promote to `OPTION_1/2/3` (board holds sync) → `CONFIRMED` (conflict check, job room created) → optional `Travel` + `Room` call sheet → `DONE` → `Invoice from job` → mark `PAID` → auto `ModelPayout` rows.

---

## 2. Agency BOOKER

Same as OWNER except **cannot**: edit agency profile, manage team, billing checkout (unless also granted). **Can**: everything in jobs, roster, packages, clients, scouting, broadcasts, contracts (create/send), analytics (view).

---

## 3. Agency PRODUCTION

| Allowed | Blocked |
|---------|---------|
| View jobs, edit job details, assignment status tweaks | Create/delete jobs, invoices, payouts |
| Job room (upload files, schedule), travel | Packages, client portal setup, contracts |
| Model edits, compliance view | Analytics (no `analytics.view`), broadcasts |

---

## 4. Agency ACCOUNTS

| Allowed | Blocked |
|---------|---------|
| Invoices, payouts, contracts, billing portal | Jobs, board edits, packages, scouting |
| Activity log, analytics | Model portfolio uploads |

---

## 5. Model (`/m`)

| Action | Handler | Notes |
|--------|---------|-------|
| Home + broadcasts | `/m`, `respondToBroadcast` | Accept → auto OPTION_1 if job linked |
| Availability calendar | `/m/availability` | Own dates only |
| Job detail | `/m/jobs/[jobId]` | If assignment on job |
| Accept / decline hold | `decline-actions` | OPTION / CONFIRMED decisions |
| Counter-rate, check-in, callsheet confirm | `decline-actions` | |
| Job room **chat only** | `sendRoomMessage` | No file upload / schedule edit (server enforced) |
| Messages | `/m/messages` | Agency DM |
| Earnings | `/m/earnings` | PDF statements |
| Own card (read) | `/m/card` | |
| Settings / export / delete | `/m/settings`, `/api/me/*` | GDPR |

**Flow — model receives casting:**  
Broadcast → **Available** → assignment OPTION_1 → booker CONFIRMED → notification on call sheet → model confirms read → check-in on set day.

---

## 6. Client portal (`/client/[token]`)

| Action | Handler | Auth |
|--------|---------|------|
| List jobs | `/client/[token]` | `portalToken` + `portalEnabled` |
| View job lineup | `/client/[token]/jobs/[jobId]` | same |
| Approve / flag model | `clientReactToAssignment` | same |

**Flow:** Agency enables portal on client → copies magic link → client opens job → approves or flags each model in lineup.

---

## 6b. Client platform account (`/c`)

| Action | Route | Notes |
|--------|-------|-------|
| Home / agencies / settings | `/c`, `/c/agencies`, `/c/settings` | `User.role = CLIENT` + `ClientProfile` |
| Bookings & approvals | `/c/jobs`, `/c/jobs/[jobId]` | Requires `Client.platformUserId` linked by email |
| Submit brief | `/c/briefs` → `submitClientBrief` | Routes to linked agency; workbench shows accept |
| Sign up | `/signup/client` | Auto-links agency `Client` rows with same email |

**Flow:** Booker creates client with `client@brand.com` → brand signs up with same email → linked → sees jobs at `/c/jobs` and can submit briefs.

---

## 7. Public / token flows (no account)

| Flow | Entry | Outcome |
|------|-------|---------|
| **Talent package** | `/package/[token]` | View models; password cookie if set; **view counted** |
| **Agency roster site** | `/a/[signupCode]` | Public ACTIVE models (Pro+ `publicSite`) |
| **Scouting** | `/scouted/[code]` | Creates `Prospect` |
| **Casting booking** | `/casting/[code]` | Books `CastingSlot` |
| **Contract sign** | `/sign/[token]` | `signContract` → SIGNED |
| **Team invite** | `/signup/team?token=` | `consumeTeamInvite` → staff user |

---

## 8. Consistency rules (enforced in code)

1. **Tenant isolation** — Every query includes `agencyId` from session (or token lookup for public routes).
2. **Role before mutation** — Agency mutations call `requireAgencyStaffCan(action)` (not only `requireAgencyStaff()`).
3. **Plan before premium feature** — `packages`, `scouting`, `analytics`, `publicSite`, `csvExport`, `contracts`, `invoices` gated via `plan-guard`.
4. **Model job room** — Models with assignment: read files/schedule; **write** chat only (`room-actions` `assertRoomAccess`).
5. **Holds follow assignments** — `syncHoldsForJob` after assignment status changes; board reflects OPTION/CONFIRMED colors.
6. **Client portal ≠ package** — Portal is job-centric approvals; packages are marketing/portfolio links with view analytics.
7. **Soft delete** — Jobs/invoices/contracts → trash 30 days → cron purge.

---

## 9. Gaps vs Frava (roadmap)

| Frava capability | LuxLane status |
|------------------|----------------|
| Shareable packages + view analytics | **Done** — `/agency/packages`, `/package/[token]` |
| Bulk email package link | **Done** — `emailTalentPackage` |
| Native mobile apps | Web `/m` only — PWA optional later |
| Push notifications | In-app poll bell — no FCM/APNs yet |
| Full website CMS | Light `/a/[code]` roster only |
| 32 languages | EN + partial FR |
| Package open tracking per recipient | View count + last viewed — not per-email identity yet |

---

## 10. Quick reference — permission matrix

See `src/lib/permissions.ts` for the full `OWNER | BOOKER | PRODUCTION | ACCOUNTS` matrix. When adding a button, gate with `can(role, action)` in the UI **and** `requireAgencyStaffCan` in the server action.
