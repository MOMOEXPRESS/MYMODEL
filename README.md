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
- ⬜ Sprint 3 — Jobs + Assignments
- ⬜ Sprint 4 — Comp card generator
- ⬜ Sprint 5 — Communication (1:1 + broadcasts)
- ⬜ Sprint 6 — Job Room + files
- ⬜ Sprint 7 — Polish + onboarding + notifications

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
