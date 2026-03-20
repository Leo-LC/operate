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
- **NEXTAUTH_URL** — `http://localhost:3000` in dev; your Vercel URL in production (e.g. `https://your-app-name.vercel.app`), or later your custom domain (e.g. `https://reviews.yourdomain.com`)
- **ALLOWED_GOOGLE_EMAILS** — Optional comma‑separated whitelist of exact emails allowed to sign in (e.g. `leo@capybaracoffeethailand.com,bookings@capybaracoffeethailand.com`).
- **ALLOWED_GOOGLE_DOMAIN** — Optional domain‑wide allow rule (e.g. `capybaracoffeethailand.com`). Evaluated in addition to `ALLOWED_GOOGLE_EMAILS`.
- **OWNER_GOOGLE_EMAILS** — Optional; explicit list of owner accounts (else the first `ALLOWED_GOOGLE_EMAILS` entry is treated as owner).
- **GOOGLE_BUSINESS_ACCOUNT_ID** — Optional; forces a specific Google Business Profile account if the signed-in user has several.
- **SUPABASE_URL** — Supabase project URL (from Project Settings → API).
- **SUPABASE_SERVICE_ROLE_KEY** — Supabase service role key (server-side only; never expose to the browser).

### 2. Google OAuth redirect URIs

In the Google Cloud OAuth client, add:

- **Dev:** `http://localhost:3000/api/auth/callback/google`
- **Prod (Vercel subdomain):** `https://<your-vercel-domain>.vercel.app/api/auth/callback/google`
- **Prod (custom domain, optional):** `https://<your-custom-domain>/api/auth/callback/google`

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

## Deploying to Vercel (production)

1. **Create Vercel project**
   - Import this repo into Vercel as a new project.
   - Vercel should auto-detect Next.js and set the correct build / output settings.
2. **Configure environment variables in Vercel**
   - In Project → Settings → Environment Variables, add all vars listed in _Environment variables_ above, using:
     - `NEXTAUTH_URL=https://<your-vercel-domain>.vercel.app` initially.
     - The same Google and Supabase values you use locally.
3. **Configure Google OAuth for production**
   - In Google Cloud Console → OAuth client:
     - Ensure the redirect URIs include both:
       - `https://<your-vercel-domain>.vercel.app/api/auth/callback/google`
       - And later, if you add a custom domain, `https://<your-custom-domain>/api/auth/callback/google`.
4. **First production test**
   - Deploy the project on Vercel.
   - Visit `https://<your-vercel-domain>.vercel.app`, sign in with an allowed Google account, and confirm:
     - Dashboard loads and reviews appear.
     - Reply templates/categories load correctly (coming from Supabase `shared_config`).

## App structure

- **`/`** — Login (Sign in with Google)
- **`/dashboard`** — Protected; sync unreplied reviews, view by 5★ / 4★ / Needs attention, send replies (single or bulk)

API routes use the session access token server-side only:

- `GET /api/reviews/sync` — Fetch all unreplied reviews from the 7 locations (with pagination)
- `PUT /api/reviews/reply` — Send one reply (body: `locationName`, `reviewId`, `comment`)
