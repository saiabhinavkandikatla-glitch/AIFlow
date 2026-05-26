# AIFlow

AIFlow is a full-stack SaaS app for transferring AI conversation context between models. It imports a prior conversation, analyzes it with Gemini, saves a structured Thread Object, and generates optimized continuation prompts for ChatGPT, Claude, Gemini, DeepSeek, and Grok.

## Stack

- Frontend: React, Vite, Tailwind CSS, shadcn-style local UI primitives, Supabase Auth
- Backend: Node.js, Express, Prisma ORM, PostgreSQL, Supabase JWT validation
- AI: Google Gemini API, default model `gemini-2.5-flash`
- Deployment targets: Vercel frontend, Railway backend

## Local Setup

1. Copy environment files.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Fill in `DATABASE_URL`, `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.

3. Configure Supabase Auth:

- Enable email/password auth and email confirmations.
- Enable Google OAuth in Supabase if you want Google login.
- Set Site URL to `http://127.0.0.1:5173`.
- Add redirect URLs for `http://127.0.0.1:5173/auth/callback` and `http://127.0.0.1:5173/reset-password`.
- In Google Cloud Console, set the OAuth Web Client authorized redirect URI to your Supabase callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Keep `frontend/.env` `VITE_AUTH_REDIRECT_URL` exactly equal to the Supabase redirect URL: `http://127.0.0.1:5173/auth/callback`.

4. Prepare the database.

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:dev
```

5. Start both apps in separate terminals.

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`; backend runs on `http://localhost:4000`.

## Auth Troubleshooting

For local testing, use one host consistently. This project is configured for `http://127.0.0.1:5173`; using `localhost` in one place and `127.0.0.1` in another can break OAuth redirect allow-list checks.

Canonical local URLs:

```bash
FRONTEND_URL=http://127.0.0.1:5173
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173/auth/callback
```

Supabase Dashboard:

- Authentication > URL Configuration > Site URL: `http://127.0.0.1:5173`
- Authentication > URL Configuration > Redirect URLs:
  - `http://127.0.0.1:5173/auth/callback`
  - `http://127.0.0.1:5173/reset-password`

Google Cloud Console OAuth client:

- Authorized JavaScript origins: `http://127.0.0.1:5173`
- Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`

Do not put `http://127.0.0.1:5173/auth/callback` in Google Cloud as the authorized redirect URI. That localhost callback belongs in Supabase redirect URLs. Google redirects to Supabase first, then Supabase redirects back to AIFlow.

If Google returns `Unable to exchange external code`, re-copy the Google Web Client ID and Client Secret into Supabase Authentication > Providers > Google. The Client ID and Client Secret must come from the same Google OAuth Web Client.

If Google shows `Error 400: redirect_uri_mismatch`, the app code has not received a callback yet. Fix the Google Cloud OAuth Web Client by adding the exact Supabase callback URL above, save, wait a minute, then try Google sign-in again.

The frontend Supabase client is configured for PKCE:

```ts
createClient(url, key, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'aiflow.auth'
  }
})
```

Google sign-in clears stale local auth state before starting a new OAuth attempt, and `/auth/callback` is the only route that exchanges `?code=` with `supabase.auth.exchangeCodeForSession(code)`.

Email rate limits:

- Supabase hosted projects using the built-in email provider have a very small email-send limit during testing. For repeated signup tests, configure custom SMTP in Supabase Authentication settings.
- For Supabase CLI local development, edit `supabase/config.toml`, then restart Supabase:

```toml
[auth]
site_url = "http://127.0.0.1:5173"
additional_redirect_urls = [
  "http://127.0.0.1:5173/auth/callback",
  "http://127.0.0.1:5173/reset-password"
]

[auth.rate_limit]
email_sent = 30
sign_in_sign_ups = 60
```

## Core Features

- Email/password signup with Supabase email verification
- Google OAuth login through Supabase
- Forgot password and reset password flows
- Protected dashboard and app routes
- Profile settings, password change, plan display, usage display, and account deletion of app data
- Thread creation from share link, `.txt`/`.json` upload, raw paste, or manual description
- Gemini-powered topic, goal, decisions, last point, next step, tag, and prompt generation
- Thread library with search, date filter, detail view, rename, delete, and prompt regeneration
- Pricing UI for Free, Starter, Pro, and Team tiers
- Stripe billing routes for checkout, customer portal, and subscription webhooks
- Global glass-style toast system with success, info, warning, and persistent recovery-focused error states

## Toast API

Use the app toast helper from `frontend/src/lib/toast.tsx`:

```tsx
import { toast } from '@/lib/toast'

toast.error({
  title: 'Google sign-in did not finish',
  message: 'Unable to exchange external code.',
  recovery: 'Clear local auth state and start a fresh Google OAuth attempt.',
  action: () => retryGoogleConnection(),
  persistent: true
})
```

Non-blocking success, info, and warning messages show a countdown progress bar. Critical error toasts stay visible until the user dismisses them or runs the recovery action.

## Deployment

### Backend on Railway

Use `backend` as the Railway root directory. Set these environment variables:

```bash
DATABASE_URL=
DIRECT_URL=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
SUPABASE_URL=
SUPABASE_ANON_KEY=
JWT_SECRET=
FRONTEND_URL=https://your-vercel-domain.vercel.app
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_TEAM_PRICE_ID=
```

Railway uses `backend/railway.json` to start the built API. The current Supabase schema has already been pushed with Prisma.

### Frontend on Vercel

Use `frontend` as the Vercel root directory. Set:

```bash
VITE_API_URL=https://your-railway-backend.up.railway.app
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AUTH_REDIRECT_URL=https://your-vercel-domain.vercel.app/auth/callback
```

`frontend/vercel.json` rewrites all routes to the Vite SPA entry.

After deployment, add these Supabase Auth redirect URLs:

- `https://your-vercel-domain.vercel.app/auth/callback`
- `https://your-vercel-domain.vercel.app/reset-password`

## API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `DELETE /api/auth/me`
- `POST /api/threads/create`
- `GET /api/threads`
- `GET /api/threads/:id`
- `PATCH /api/threads/:id`
- `DELETE /api/threads/:id`
- `POST /api/threads/:id/regenerate`

If `GEMINI_API_KEY` is not set, the backend falls back to deterministic local prompt generation so the flow remains testable during setup.
