# CoralFrame

A visual, no-code builder for backend workflows and AI automations — wire triggers, transforms, AI steps, and actions together on a canvas and ship it. Think n8n, built with a distinctive ruby-on-charcoal identity.

## Stack

- **Next.js 16** (App Router, Cache Components, Partial Prerendering) + **React 19**
- **TypeScript** (strict), **Tailwind CSS v4**, shadcn/base-ui primitives
- **XYFlow** (`@xyflow/react`) for the canvas
- **Prisma 7** + **Neon** (pooled `DATABASE_URL` for the app, direct `DIRECT_URL` for migrations)
- **better-auth** for email/password + OAuth (GitHub, Google) with signed cookie sessions

## Getting started

Requires Node.js 20+ and pnpm.

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
pnpm prisma migrate dev
pnpm dev               # http://localhost:3000
```

OAuth providers (GitHub / Google) are optional — the app signs in with email/password by default.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm prisma migrate dev` | Apply/create migrations |

## Project structure

```
app/
  (auth)/            sign-in / sign-up flows
  (root)/            dashboard + workflow editor routes
  api/auth/          better-auth handler
  modules/
    auth/            auth actions, user button, sign-in form
    canvas/          XYFlow canvas — builder, palette, inspector, autosave, edges, nodes
    nodes/           node registry (types, accents, brand glyphs) + icon tiles
    workflows/       dashboard: list, rows, stats, new/rename, top navigation
components/          shared UI primitives (button, dialog, switch, avatar, …)
lib/                 prisma client, auth config, utils
prisma/              schema + migrations
```

## Security & credentials

- **Workflows and their node configs are persisted as JSON.** API keys, bot tokens, integration secrets, webhook secrets and OAuth secrets are treated as sensitive material: retrieval paths redact them before they reach the browser, and webhook ingestion strips secret-looking headers before storing payloads.
- **Workspace credentials are stored encrypted** (AES-256-GCM) in the `credential` table and referenced from nodes by id (`credentialId`). Decryption happens only server-side, inside executors, at execution time — raw secrets never travel to the frontend.
- Set `CREDENTIALS_ENCRYPTION_KEY` (32 bytes, `openssl rand -hex 32`) before storing or resolving credentials. It is intentionally not in this repo.
- **Webhook endpoints** require an optional per-node secret (`x-webhook-secret` for generic webhooks, `X-Hub-Signature-256` for GitHub, `x-telegram-bot-api-secret-token` for Telegram). They enforce payload size limits, per-workflow rate limits, method checks and timing-safe signature comparison.
- **Migration strategy for node configs storing raw secrets:** create workspace credentials via the Executors UI (or the credential actions), then replace the inline secret fields in node config with `credentialId` references. Raw secrets remain executable for backward compatibility, but should be rotated once migrated.

## Notes

- The canvas autosaves (1.5 s debounce) — the navbar pill reflects `saving → saved`.
- Workflow graphs are persisted as JSON on the `Workflow` model; palette is collapsible, steps draggable/clickable.
- `.env` is never committed; see `.env.example`. AI coding-agent tooling lives outside the repo (gitignored).
