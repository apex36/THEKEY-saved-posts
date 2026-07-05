# Community Forum — Saved Posts

Full-stack take-home: a course discussion feed with an end-to-end **Saved Posts** (bookmark) feature.

Monorepo: `server/` (Bun + Elysia + Drizzle + PostgreSQL) · `web/` (Next.js 16 + React 19 + TanStack Query v5 + next-intl).

## Prerequisites

- **Bun** ≥ 1.2 ([bun.sh](https://bun.sh))
- **Node.js** ≥ 20 — Next.js and the `tsx`-based DB scripts run on Node
- **Docker** — for Postgres only; **tests run without it**

## Setup

```bash
# install
bun install

# create schema and seed data (starts dockerized Postgres 17 on :5432)
docker compose up -d --wait
bun run db:migrate
bun run db:seed

# start the API  → http://localhost:3001
bun run dev:server

# start the UI   → http://localhost:3000
bun run dev:web

# run unit + API + integration tests (no Docker required)
bun run test

# strict typecheck, both workspaces
bun run typecheck
```

### Optional: browser e2e (Playwright)

Requires the full stack running (DB + API + web, as above) plus a one-time `bunx playwright install chromium`:

```bash
bun run --filter @app/web test:e2e   # reseeds, then walks every UI requirement live
```

The web app reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).

## Demo identities (switch in the header)

| User | Role | Enrolled in |
|---|---|---|
| Alice | student | TypeScript 101 |
| Bilal | student | Databases 201 |
| Chen | student | both courses |
| Mona | moderator | — (sees every course, can remove posts) |

Things worth trying:

- As **Alice**, save a post — the count updates instantly; find it on the **Saved** tab. Save it again via the API and note nothing double-counts.
- Switch to **Bilal** — Alice's saved list is gone (saved lists are strictly own-only) and only Databases 201 is visible (Alice's course would 403).
- As **Mona**, browse both courses and remove a post — it disappears from feeds *and* from everyone's saved lists.
- Alice's save of "satisfies vs as const" was un-saved in the seed — re-saving it **reactivates the original record** rather than creating a duplicate.

## Locales

English (`/en`, default) and Arabic (`/ar`, full RTL — layout mirrors automatically). Switch in the header. Every user-facing string comes from the message catalogs; the saves count pluralizes correctly in both (Arabic exercises all six plural categories). The API emits machine codes only.

## Layout

```
server/src/
├─ db/        schema, migrations, client, seed
├─ domain/    pure business rules (save/unsave decisions, cursor codec)
├─ repos/     repository interfaces + Drizzle and in-memory implementations
├─ services/  ForumService — authorize → decide → apply
├─ contracts/ Zod request schemas
└─ http/      Elysia app: auth resolve, exact status codes, routes
server/tests/ unit · api (app.handle) · integration (PGlite)
web/src/
├─ app/[locale]/  feed + saved pages (containers)
├─ components/    presentation-only components
├─ hooks/         React Query hooks (optimistic bookmark toggle)
├─ lib/           Eden typed client · query-key factory · demo identity store
└─ i18n/          routing + en/ar message catalogs
```

See **NOTES.md** for key design decisions, trade-offs, and what I'd do next.
