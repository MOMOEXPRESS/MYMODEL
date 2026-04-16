# LuxLane

[![build status](https://img.shields.io/badge/build-clean-brightgreen)](https://github.com/momoexpress/mymodel)
<!-- deploy-trigger: 2026-04-15 -->


An all-in-one operations platform for boutique and mid-size modeling agencies —
replacing the patchwork of spreadsheets, WhatsApp and Dropbox they currently run on.

> See the full product brief for vision, users, scope, data model and sprint plan.

## Stack

- **Next.js 15** (App Router, React 19)
- **Prisma 6 + Postgres** (Neon in production)
- **TailwindCSS** with a custom editorial palette
- **JWT cookie auth** (jose) + bcrypt
- **Vercel Blob** for uploads (wired in Sprint 1)
- **Upstash Redis** for rate limiting + realtime (wired in Sprint 5)

## Getting started

```bash
npm install
cp .env.example .env
# set DATABASE_URL to a local or Neon Postgres
# set AUTH_SECRET to a 32+ char random string

npm run db:push          # apply the Prisma schema
npm run db:seed          # 1 demo agency + 20 models
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. **Create the project.** "Add new → Project" in Vercel, pick `momoexpress/mymodel`.
   The included `vercel.json` sets the build command and installs deps.
2. **Provision a Postgres.** Easiest: Vercel's integrated Neon — "Storage → Create Database
   → Postgres". It will auto-attach a `DATABASE_URL` env var to the project.
3. **Add two env vars** (Settings → Environment Variables, all environments):
   - `AUTH_SECRET` — any 32+ char random string (e.g. `openssl rand -hex 32`).
   - `BLOB_READ_WRITE_TOKEN` — optional; only needed for uploaded files. Create a
     Vercel Blob store from Storage → Create and the token is auto-attached.
4. **Deploy.** The build script runs `prisma generate && next build`. Deliberately
   minimal — schema application is not part of the build, so missing env vars can't
   break it and the build stays fast. Apply the schema separately (next step).
5. **Apply the schema and seed, once, from your machine.** Vercel's CLI gives you
   a `.env` pointing at the live Postgres:
   ```bash
   npm i -g vercel
   vercel link
   vercel env pull .env.production.local
   # run Prisma against that env
   cp .env.production.local .env.tmp && mv .env.tmp .env
   npm run db:push      # applies the schema (one-off)
   npm run db:seed      # demo agency + 20 models (optional)
   ```
   From then on, every deploy just runs `next build`. When you change the schema,
   re-run `npm run db:push` from your laptop (or switch to `prisma migrate` once
   you want real migrations).

> Env vars are accessed lazily — `npm run build` succeeds even before `DATABASE_URL`
> or `AUTH_SECRET` are wired, so the first deploy won't fail during
> "Collecting page data". Missing vars only throw when a request actually uses them.

### Demo accounts (after `db:seed`)

| Role  | Email                          | Password     |
| ----- | ------------------------------ | ------------ |
| Owner | `owner@mademoiselle.demo`      | `luxlane-demo` |
| Model | `model1@mademoiselle.demo` … `model20@…` | `luxlane-demo` |

Agency signup code: `PARIS001`.

## Sprint status

- ✅ **Sprint 0 — Foundation.** Next.js + Prisma + Tailwind scaffold, JWT cookie auth,
  full §7 data model, seed, agency dashboard shell, model web shell, auth pages.
- ✅ **Sprint 1 — Roster + Model card + uploads.** Roster search/filter, model detail
  page with editable stats, portfolio (book / polaroids / video), documents with
  expiry tracking, 8-week availability calendar. Uploads run through
  `@vercel/blob` in prod and fall back to `public/uploads/` in local dev.
- ✅ **Sprint 2 — The Board.** A sticky-header, sticky-left-column grid with
  one row per model and one column per date. 14/30/60-day window, division
  filter, live model search, prev/next/today nav, hover tooltips, drag-to-select
  rectangles across rows and columns, one-click bulk availability edits with
  optimistic UI. Powered by `GET /api/board` and `PATCH /api/board/cell`.
- ✅ **Sprint 3 — Jobs + Assignments.** Full Job CRUD (title, dates, location,
  rate, brief, client contacts), status pipeline `DRAFT → OPEN → CONFIRMED →
  IN_PROGRESS → DONE / CANCELLED`. Attach models from the roster with a
  searchable multi-select dialog. Per-model assignment status
  (`PROPOSED → OPTION_1/2/3 → CONFIRMED → DONE` / `DECLINED` / `RELEASED`) and
  per-model rate overrides. Holds are auto-derived from assignments so the
  Board lights up in amber/orange/green the instant you promote a model.
  Non-blocking conflict detection warns when confirming a model already
  CONFIRMED on another overlapping job. First CONFIRMED assignment auto-
  creates the Job Room (used in Sprint 6).
- ✅ **Sprint 4 — Comp card generator.** Pick up to 5 photos, first is the
  hero; live HTML preview; one-click export to branded PDF
  (`@react-pdf/renderer`) or PNG (`next/og` / Satori). Both routes are
  tenant-guarded and accept the same `imageIds=` query string so agency and
  model sides stay consistent. Available from the "Comp card" button on
  every model's detail page.
- ✅ **Sprint 5 — Communication.** 1:1 threads between agency staff and each
  model (multi-staff threads per agency↔model pair, polled every 4s), plus
  Broadcasts: compose a message with optional job attachment, pick N models,
  send. Models tap Available / Can't make it on their home screen; agency sees
  live Accepted / Declined / Pending tallies per broadcast.
- ✅ **Sprint 6 — Job Room + files.** Each job has a Room with a call-sheet /
  brief / lookbook file upload area (with 25 MB cap, CALLSHEET uploads
  notifying every confirmed model), a schedule with date/time/location/notes,
  and a chat pane. Models with any assignment on the job get read-only access
  to files + schedule and full chat via /m/jobs/[jobId]. Rooms auto-create on
  first CONFIRMED assignment.
- ✅ **Sprint 7 — Onboarding + notifications.** Notification bell in both
  shells with unread dot, polling /api/notifications, "mark all read". System
  notifications generated on: new 1:1 message, new broadcast, call-sheet
  posted. First-time agency dashboard carries a welcome banner with copy-link
  for the signup URL prefilled with the agency's code. Agency nav now
  surfaces Broadcasts as a first-class destination.
- ✅ **Tier 2 + Tier 3 expansion.**
  - **Team members (#20):** invite/role flow, signup-by-token route
    (`/signup/team?token=…`), per-row remove.
  - **Doc expiry (#18):** `/agency/compliance` lists every expired or
    <90-day-expiring document across the roster with days-past / days-until.
  - **Travel (#13):** `TravelItem` schema + section on job detail with
    flights/trains/hotels/transfers. Per-model or whole-job. Surfaced
    read-only on the model's `/m/jobs/[id]`.
  - **Invoices (#15):** French-compliant PDF with SIRET/TVA/penalty legal
    footer, status (draft/sent/paid/overdue/cancelled), auto-generated
    number (`FAC-YYYY-####`), job→invoice auto-line-items from confirmed
    assignments, dashboard KPIs.
  - **CSV export (#19):** `/api/invoices/export.csv` for
    Pennylane/QuickBooks import.
  - **Earnings (#16):** `/api/earnings/[modelId]/pdf?year&month` renders a
    monthly statement — gross, commission, net — using the model's or
    agency's commission %.
  - **Contracts + in-app e-sig (#14):** upload PDF → send-for-signature →
    public `/sign/[token]` page where the counter-party types their name.
    Stub for YouSign (wire the real API keys later; audit trail and UX
    stay the same).
  - **Tear sheets (#17):** `/agency/models/[id]/tearsheets` lists completed
    jobs + book photos as an auto-CV.
  - **Prospects / Scouting (#23):** kanban-lite pipeline with
    Spotted → Contacted → Meeting → Signed / No, photo upload, notes.
  - **Public agency site (#22):** toggle in settings → `/a/<signupCode>`
    shows the ACTIVE roster by division with hero book photos. 5-minute
    edge cache.
  - **Analytics (#26):** 6-month revenue bars, top earners, underused
    models (no DONE jobs in 90 days), option→confirm conversion rate.
  - **Stripe Connect (#21) & YouSign:** placeholder fields on `Agency`
    (`stripeAccountId`) and the contract-sign flow is already token-based
    so a real YouSign envelope can be swapped in without UX changes.
- ✅ **Reliability + business model.**
  - **Billing:** Stripe Checkout + Customer Portal + webhook with three
    plans (Starter €199 / Pro €399 / Scale €799), 14-day trial, plan
    limits enforced on model signup.
  - **Stripe Connect:** Express onboarding for agencies; when an invoice
    is marked PAID we auto-generate `ModelPayout` rows (gross /
    commission / net) per confirmed model. Agency → `/agency/payouts`;
    model → `/m/earnings`.
  - **Email (Resend):** Password reset, team invites, signing links.
    Console fallback in dev.
  - **Password reset:** `/forgot-password` → email → `/reset-password`.
    Never leaks account presence. Rate-limited.
  - **Rate limiting:** Upstash-backed sliding-window on login + signup +
    forgot-password. In-memory fallback when no Upstash.
  - **Background cron:** `/api/cron/overdue-invoices`,
    `/api/cron/doc-expiry`, `/api/cron/purge-trash` — scheduled in
    `vercel.json`, protected by `CRON_SECRET`.
  - **Activity log + soft delete:** every important mutation goes through
    `logEvent()` → `AuditEvent`; Jobs / Invoices / Contracts soft-delete
    into a 30-day trash before the cron purges.

## Structure

```
prisma/
  schema.prisma    # §7 data model
  seed.ts          # demo agency + 20 models
src/
  app/
    page.tsx           # marketing landing
    (auth)/            # login + agency & model signup
    agency/            # agency-facing app (layout + tabs)
    m/                 # model-facing web app (layout + tabs)
    api/auth/          # login, logout, signup-agency, signup-model
  components/          # nav, header, logout, empty state
  lib/
    db.ts              # Prisma singleton
    auth.ts            # cookie + JWT
    auth-guards.ts     # requireUser / requireAgencyStaff / requireModel
    env.ts             # runtime env validation
    utils.ts           # cn, signup code, initials
```
