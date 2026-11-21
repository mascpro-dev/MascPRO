# AGENTS.md

## Cursor Cloud specific instructions

### Overview

MASC PRO is a Next.js 14 (App Router) platform for Brazilian beauty professionals. Single service — no microservices, no Docker, no local database. All data lives in a remote hosted Supabase instance.

### Running the app

```bash
npm run dev          # starts dev server on http://localhost:3000
npm run lint         # ESLint (uses .eslintrc.json with next/core-web-vitals)
npm run build        # production build (currently fails due to pre-existing lint errors — see below)
```

### Known issues

- **`npm run build` fails** because the codebase has pre-existing ESLint errors (`react/no-unescaped-entities` in several files). The dev server (`npm run dev`) works fine.
- **`.eslintrc.json`** was added to avoid an interactive prompt from `next lint` when no config existed. It extends `next/core-web-vitals`.
- The root route (`/`) redirects to `/login`. Protected routes (e.g. `/loja`, `/dashboard`) also redirect to `/login` when not authenticated.
- The `/catalago` route is public and accessible without login.

### Environment variables

Supabase credentials are required in `.env.local`. See `SETUP_GUIDE.md` for the values. Key vars:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | For admin APIs | Bypasses RLS |
| `MP_ACCESS_TOKEN` | For payments | Mercado Pago integration |

### No automated tests

The repository has no test framework configured (no Jest, Vitest, Playwright, etc.). There are no automated tests to run.
