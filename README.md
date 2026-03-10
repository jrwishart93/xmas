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

## Admin system

- Admin routes now live under `/admin/*`.
- Access is controlled by the member document at `teams/rpu-social-fund/members/{uid}`.
- Required member fields are:
  - `displayName`
  - `email`
  - `role` (`member` or `admin`)
  - `disabled`
  - `createdAt`
  - `updatedAt`
- The legacy Firebase login flow syncs a signed server session cookie so `/admin/*` can be protected by middleware.
- Set `SESSION_COOKIE_SECRET` in server environment before using the admin area.

### Creating an admin account

1. Create the Firebase Auth user you want to use for admin access.
2. Create or update their member document at `teams/rpu-social-fund/members/{uid}`.
3. Set `role: "admin"` on that member document.

## Payments (TrueLayer Open Banking)

This project now uses TrueLayer for SCN Open Banking payments.

### 1) Install dependencies

```bash
npm install
```

`truelayer-client` is installed per request, but the actual payment flow is implemented against TrueLayer Payments v3 endpoints (with signed requests) using `truelayer-signing`.

### 2) Configure environment variables

1. Copy `.env.local.example` to `.env.local`.
2. Fill in all Firebase and TrueLayer values.
3. Keep `.env.local` out of git (already ignored).

For rollout:

- Start with `TRUELAYER_ENV=sandbox` and complete an end-to-end test.
- Switch to `TRUELAYER_ENV=live` only after sandbox is verified.

The app supports environment-specific vars by suffix, for example:

- `TRUELAYER_CLIENT_ID_SANDBOX` / `TRUELAYER_CLIENT_ID_LIVE`
- `TRUELAYER_CLIENT_SECRET_SANDBOX` / `TRUELAYER_CLIENT_SECRET_LIVE`
- `TRUELAYER_MERCHANT_ACCOUNT_ID_SANDBOX` / `TRUELAYER_MERCHANT_ACCOUNT_ID_LIVE`
- `TRUELAYER_SIGNING_KEY_ID_SANDBOX` / `TRUELAYER_SIGNING_KEY_ID_LIVE`
- `TRUELAYER_SIGNING_PRIVATE_KEY_SANDBOX` / `TRUELAYER_SIGNING_PRIVATE_KEY_LIVE`

Unsuffixed fallback vars are also supported.

Optional payment flags:

- `PAYMENT_METHOD_OPEN_BANKING_ENABLED=true|false`
- `PAYMENT_METHOD_BANK_TRANSFER_ENABLED=true|false`

### 3) Configure TrueLayer webhook

Point your TrueLayer webhook to:

`<APP_BASE_URL>/api/truelayer-webhook`

The webhook route verifies `Tl-Signature` using TrueLayer JWKs and marks SCNs as paid when payment execution/settlement events arrive.

### 4) Payment config endpoint

`GET /api/payment-config` returns:

- Bank details to display on the SCN payment page (`BANK_ACCOUNT_NAME`, `BANK_SORT_CODE`, `BANK_ACCOUNT_NUMBER`).
- Enabled payment methods and TrueLayer environment/config readiness.

### 5) User flow

1. User opens `/app/scn/<scnId>/`.
2. User clicks **Pay by Bank App** (Open Banking).
3. API creates a TrueLayer payment and returns hosted payment URL.
4. User authorizes in their bank app.
5. Webhook confirms payment and updates Firestore balances.

### Security note

If any TrueLayer client secret was shared in chat/logs, rotate it in TrueLayer before production launch.

## TrueLayer Data API (Monzo Balance)

This project also supports a team-level Monzo connection for live bank balance retrieval.

### Required environment

Set these in Vercel/server runtime:

- `TRUELAYER_CLIENT_ID`
- `TRUELAYER_CLIENT_SECRET`
- `TRUELAYER_REDIRECT_URI`
- `TRUELAYER_API` (default is `https://api.truelayer.com`)

`TRUELAYER_REDIRECT_URI` is strictly enforced to:

`https://team-sigma-three.vercel.app/api/truelayer/callback`

### Data API routes

- `GET /api/truelayer/connect` (admin only)
  - Creates OAuth state and returns a TrueLayer auth URL for Monzo consent.
- `GET /api/truelayer/callback` (public callback)
  - Validates state, exchanges code for tokens, selects/stores account, redirects to dashboard.
- `GET /api/truelayer/balance` (team member only)
  - Refreshes token if needed and returns:
  - `{ balance, currency, lastUpdated }`

### Dashboard behaviour

- Dashboard includes a `Team Social Fund` bank card.
- Admins can click `Connect Bank` when no connection exists.
- Balance auto-refreshes every 60 seconds.
- Current phase is balance-only; transaction ingestion/filtering is intentionally deferred.
