# LuxLane

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

### Demo accounts (after `db:seed`)

| Role  | Email                          | Password     |
| ----- | ------------------------------ | ------------ |
| Owner | `owner@mademoiselle.demo`      | `luxlane-demo` |
| Model | `model1@mademoiselle.demo` … `model20@…` | `luxlane-demo` |

Agency signup code: `PARIS001`.

## Sprint status

- ✅ **Sprint 0 — Foundation.** Next.js + Prisma + Tailwind scaffold, JWT cookie auth,
  full §7 data model, seed, agency dashboard shell, model web shell, auth pages.
- ⬜ Sprint 1 — Roster + Model card + uploads
- ⬜ Sprint 2 — The Board (the killer view)
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
