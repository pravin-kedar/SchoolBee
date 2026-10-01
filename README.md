# SchoolBee

Simple school management for preschools, play schools and daycares — a PaperBee product.

This folder is the **frontend only** (React + Vite + TypeScript + Tailwind v4). It uses the shared
PaperBee backend in `../backend-paper-bee`; every SchoolBee endpoint lives under
`/api/v1/schoolbee/...`.

## Run

```bash
npm install
npm run dev            # http://localhost:5175 - /api is proxied to the backend on :8000
npm run build          # static output in dist/ (deploy to Vercel; vercel.json handles SPA routes)
```

Production: set `VITE_API_BASE_URL` (e.g. `https://api.paperbee.in/api/v1`) and add the SchoolBee
domain to the backend's `CORS_ORIGINS`, `SCHOOLBEE_APP_URL` and Google redirect URIs.

## Auth

Accounts are shared with PaperBee (same email/password). Schools are organizations of kind
`school`, visible only in SchoolBee. Tokens live in localStorage ("Remember me") or sessionStorage.

| Route | Page |
|---|---|
| `/` | Home |
| `/login`, `/signup` | Email login / owner + school signup, "Continue with Google" |
| `/auth/google/complete` | Google return page (trades the one-time code for tokens) |
| `/dashboard` | Placeholder after login; asks for a school name if the account has none |

## Layout

- `src/pages/` — pages
- `src/lib/` — API client (auto token refresh), token store, auth calls
- `src/components/home/` — home page sections
- `src/content/home.ts` — home page copy, pricing, FAQs (edit text here)
- `src/assets/` — images processed from `doc/school-bee-doc/icon` (bees cut out of the sticker sheet)
- `DOC/` — project notes
