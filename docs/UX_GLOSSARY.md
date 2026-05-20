# LuxLane UX glossary

Shared language across agency schedule, model app, and client surfaces. **Simple labels** show by default; **hold detail** (1st / 2nd / 3rd) is optional for power users on the agency schedule.

## Calendar & availability

| Simple | Meaning | Hold detail (agency schedule) |
|--------|---------|-------------------------------|
| **Available** | Open for bookings | — |
| **On hold** | Held for a job, not confirmed | 1st hold, 2nd hold, 3rd hold |
| **Confirmed** | Booked and locked | — |
| **Away** | Off or traveling | Unavailable, Traveling |
| **On set** | Working a confirmed job today | On job |

Implementation: `src/lib/status-language.ts`, `StatusChip`, `StatusLegend`, agency schedule **Hold detail** toggle.

## Bookings (jobs)

| Agency term | Model / client term |
|-------------|---------------------|
| Booking | Booking / job |
| Workbench | Home (agency) |
| Schedule | Schedule (board) |
| Lineup | Models on the job |
| Job room | Open room (confirmed) |

## Platform

| Term | Meaning |
|------|---------|
| **Network** | Mutual connections between platform users |
| **Group event** | Collaborative shoot or casting hosted by a user |
| **Client portal** | Magic-link view for brand clients (no password) |
| **Client account** | Logged-in brand at `/c` — linked to agency CRM by email |
| **On hold** | Default schedule label for OPTION_1/2/3 (toggle hold detail for 1st/2nd/3rd) |
| **Rules** | In-app help at `/rules` — permissions, plans, holds, billing |

## Role homes (after sign-in)

| Role | Home route |
|------|------------|
| Agency owner / booker | `/agency/workbench` |
| Agency production | `/agency/production` |
| Agency accounts | `/agency/money` |
| Model | `/m` |
| Client (platform) | `/c` |
| Creative | `/creative` |
| Member | `/member` |
