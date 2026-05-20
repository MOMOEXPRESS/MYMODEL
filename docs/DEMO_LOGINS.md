# LuxLane demo logins

Use these after seeding the database. All password-protected accounts share the same password.

**Password (all email logins):** `luxlane-demo`

**Agency signup code (model self-signup):** `PARIS001`

**App URL:** `http://localhost:3000` (see `NEXT_PUBLIC_APP_URL` in `.env`)

## Reseed demo data

```bash
cd /Users/j.pebalemaurice/MYMODEL
npx prisma db push --accept-data-loss
LUXLANE_SEED_FORCE=1 npm run db:seed
```

---

## Agency staff (`/login`)

| Role | Email | Lands on |
|------|--------|----------|
| **Owner** | `owner@mademoiselle.demo` | `/agency/workbench` |
| **Booker** | `booker@mademoiselle.demo` | `/agency/workbench` |
| **Production** | `production@mademoiselle.demo` | `/agency/production` |
| **Accounts** | `accounts@mademoiselle.demo` | `/agency/money` |

**Key routes:** Schedule `/agency/schedule` · Bookings `/agency/bookings` · Talent `/agency/talent` · Network `/network` · Events `/events`

## Models (`/login`)

| Account | Email | Lands on |
|---------|--------|----------|
| Model 1–20 | `model1@mademoiselle.demo` … `model20@mademoiselle.demo` | `/m` |

**Model app:** Home `/m` · Schedule `/m/availability` · Bookings `/m/bookings` · Portfolio `/m/card`

## Platform accounts (`/login`)

| Role | Email | Lands on |
|------|--------|----------|
| **Client** | `client@luxlane.demo` | `/c` |
| **Creative** | `photographer@luxlane.demo` | `/creative` |
| **Member** | `member@luxlane.demo` | `/member` |

## Client portal (no password)

| Client | URL |
|--------|-----|
| LVMH Creative (demo) | `http://localhost:3000/client/demo-client-luxlane-portal` |

Sample job: **SS26 Beauty — Paris** with four models on option.

## Signup flows

| Type | URL |
|------|-----|
| Agency | `/signup/agency` |
| Model (code `PARIS001`) | `/signup/model` |
| Client | `/signup/client` |
| Creative | `/signup/creative` |
| Member | `/signup/member` |

---

## Quick smoke test

1. **Owner** — Workbench → Schedule (toggle hold detail) → open a booking workspace.
2. **Booker** — Bookings pipeline; create or open a job.
3. **Production** — Live jobs; job room on a confirmed booking.
4. **Accounts** — Money / invoices (no roster delete).
5. **Model** — Home, Bookings, respond to a casting blast if shown.
6. **Client portal** — Magic link; open demo job.
7. **Member** — Network → connect; Events → view sample group event.
8. **Client user** — `/c` home; `/events` for group events.

---

## Database

Postgres (Docker): host port **5433**, user/password/db **`luxlane`**.

```bash
DATABASE_URL="postgresql://luxlane:luxlane@localhost:5433/luxlane?schema=public"
```
