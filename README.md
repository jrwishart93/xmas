# Social Team Fund

Refactored into a team-based Social Team Fund system with:

- Public landing page (`/`)
- Public Act page (`/act`)
- Protected app pages under `/app/*`
- 90-day rolling leaderboard
- SCN allegation / plea / court workflow
- Admin-only Kangaroo Court resolution

Legacy Brewhemia 2025 pages and assets are archived in `/archive/brewhemia-2025`.


## Data seeding

- Seed team document: `node scripts/seed-team.mjs`
- Seed the Act document: `node scripts/seed-act.mjs`
