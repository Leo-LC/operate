# Capybara Coffee — GBP Review Manager

Next.js app for managing Google Business Profile reviews across 7 Capybara Coffee locations in Thailand.

## Tech stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **next-auth** (Google OAuth)
- **Vercel** (hosting)

## Setup

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

- **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** — From [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials (project: **Capybara Google Review**, credential: **Capybara Reviews**).
- **NEXTAUTH_SECRET** — Generate with: `openssl rand -base64 32`
- **NEXTAUTH_URL** — `http://localhost:3000` in dev; your Vercel URL in production
- **ALLOWED_GOOGLE_EMAILS** — Optional comma‑separated whitelist of exact emails allowed to sign in (e.g. `leo@capybaracoffeethailand.com,bookings@capybaracoffeethailand.com`).
- **ALLOWED_GOOGLE_DOMAIN** — Optional domain‑wide allow rule (e.g. `capybaracoffeethailand.com`). Evaluated in addition to `ALLOWED_GOOGLE_EMAILS`.

### 2. Google OAuth redirect URIs

In the Google Cloud OAuth client, add:

- **Dev:** `http://localhost:3000/api/auth/callback/google`
- **Prod:** `https://<your-vercel-domain>/api/auth/callback/google`

Scopes must include: `https://www.googleapis.com/auth/business.manage`

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with Google (e.g. leo.lecee@gmail.com), then use **Sync reviews** and reply from the dashboard.

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## App structure

- **`/`** — Login (Sign in with Google)
- **`/dashboard`** — Protected; sync unreplied reviews, view by 5★ / 4★ / Needs attention, send replies (single or bulk)

API routes use the session access token server-side only:

- `GET /api/reviews/sync` — Fetch all unreplied reviews from the 7 locations (with pagination)
- `PUT /api/reviews/reply` — Send one reply (body: `locationName`, `reviewId`, `comment`)
