# Private Family Gateway

Private Family Gateway is a small Cloudflare Workers based AI API gateway for a private family or small team.

It provides:

- Cloudflare Workers + Hono API gateway.
- Cloudflare D1 for users, API keys, upstream accounts, usage logs and settings.
- Cloudflare KV for API key, settings and short-lived cache.
- Cloudflare R2 for manual backups and exported files.
- Vue 3 + Vite admin console.

## Project Layout

```text
worker/   Cloudflare Worker, Hono API, D1 migrations
web/      Vue 3 admin console
```

## Deployment Model

This follows the same split deployment style as `E:\cloudfareworker\cloud-mail`:

- Worker has its own `wrangler.toml`.
- Vue builds into `web/dist`.
- Wrangler assets serve the SPA through the Worker.
- API and gateway routes run before static assets.

Recommended public deployment path:

- Push or fork this repository on GitHub.
- Import the repository with Cloudflare Workers Builds.
- Use `worker` as the root directory.
- Build the Vue admin console and Worker in the Cloudflare build step.
- Deploy with `npx wrangler deploy`.
- Let Wrangler provision `DB`, `CACHE` and `BACKUPS` resources for the deployer account.

See [docs/github-dashboard-deploy.md](docs/github-dashboard-deploy.md) for the Dashboard-first deployment guide.

## Local Setup

```powershell
cd worker
npm install
npm run dev
```

For Dashboard deployments, use this build command:

```text
npm ci && npm --prefix ../web ci && npm run build && npm --prefix ../web run build
```

## Required Secrets

Set these before production deploy:

```powershell
wrangler secret put JWT_SECRET
wrangler secret put CREDENTIAL_SECRET
wrangler secret put ADMIN_BOOTSTRAP_TOKEN
```

## Initialize Database

After the first deployment, initialize D1 with:

```text
GET /init/<ADMIN_BOOTSTRAP_TOKEN>
```

This creates tables, indexes and seed data. It is safe to call more than once.

## Bootstrap Admin

After initializing D1, create the first admin:

```http
POST /api/v1/setup/bootstrap-admin
Authorization: Bearer <ADMIN_BOOTSTRAP_TOKEN>
Content-Type: application/json

{
  "email": "admin@example.com",
  "display_name": "Admin",
  "password": "change-me"
}
```
