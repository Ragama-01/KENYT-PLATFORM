# Kenyt Ops — Login + Capture Interface

React + TypeScript + Tailwind, styled to a navy/gold manifest identity.

## Setup
npm install
npm run dev

## Structure
- src/pages/LoginPage.tsx      — split-panel login screen
- src/components/AppShell.tsx  — navy sidebar nav (Orders / Trucks / Drivers)
- src/pages/TruckForm.tsx      — truck + compliance (insurance/inspection/speed governor)
- src/pages/DriverForm.tsx     — driver + truck assignment
- src/pages/OrderForm.tsx      — order intake (BOL, load, container, consignee)
- src/types/models.ts          — shared types matching the Postgres schema

## Deploying to Railway (VS Code extension — "Just Flow" project)

The repo is pre-configured for a 2-service + database Railway project:

| Service | Source / root dir | Build | Config file |
|---|---|---|---|
| Frontend (this repo root) | repo **root** | `Dockerfile` (nginx) | `railway.json` |
| Backend Fastify API | `Kenyt_api/` | Nixpacks + `npm run build` | `Kenyt_api/railway.json` |
| PostgreSQL | Railway DB plugin | — | — |

The frontend calls the backend through one shared constant in `src/lib/api.ts`
which reads `VITE_API_URL` (falls back to `http://localhost:4000` locally).

### Using the Railway extension
1. Open the **Railway** panel in the Activity Bar and **sign in** (Sign In → browser auth).
2. **Link** the project: run `Railway: Link Project` (Command Palette → `Ctrl/Cmd+Shift+P`)
   and choose the **Just Flow** project.
3. Make sure these changed files are **committed and pushed** to GitHub first
   (Railway deploys from GitHub: `Ragama-01/KENYT-PLATFORM`):
   - `railway.json`, `Kenyt_api/railway.json`, `Dockerfile`, `src/lib/api.ts`,
     `src/vite-env.d.ts`, `README.md`
4. In the Railway dashboard create/link the services:
   - **Backend**: root directory = `Kenyt_api`.
   - **Frontend**: root directory = repo root.
   - Add a **PostgreSQL** plugin.

### Variables to set
- **Backend service:** `DATABASE_URL` (from the Postgres plugin), plus
  `WIALON_*`, `CONTROLTECH_*`, and for email notifications (sent via Gmail SMTP):
  - `SMTP_USER` — the Gmail account that sends the notifications
    (e.g. `kenyt.notifications@gmail.com`).
  - `SMTP_PASS` — a **Gmail App Password** (16 characters) for that account —
    create it under Google Account → Security → 2-Step Verification →
    App passwords. Do **not** use the Gmail login password.
  - `SMTP_HOST` / `SMTP_PORT` — optional; default to `smtp.gmail.com` / `465`.
    (Use `smtp-relay.gmail.com` if you switch to Google Workspace SMTP relay.)
  - `SUPER_USER_EMAIL` — **required** to receive the "new order awaiting
    allocation" email whenever an order is created (this is the "super user"
    notification).
  - `EMAIL_FROM` — optional; defaults to `SMTP_USER`. Gmail only permits sending
    from the authenticated account or one of its verified aliases.
  - `TEAM_NOTIFICATION_EMAILS` — comma-separated recipients notified when a
    truck is allocated (e.g. `a@x.com,b@x.com`).

  Railway injects these at build time so `prisma generate` works; on start the
  API runs `npx prisma migrate deploy` automatically (see `Kenyt_api/railway.json`).
- **Frontend service:** `VITE_API_URL` → click **"Use reference"** → pick the
  **backend** service → **`RAILWAY_PUBLIC_DOMAIN`**. The `Dockerfile` accepts it
  as a build `ARG`, and Vite bakes it into the bundle. Redeploy after setting it.

### Verify
- `https://<backend>.up.railway.app/health` → `{"status":"ok"}`
- Open the frontend URL and log in — requests now go to the Railway backend instead of localhost.
