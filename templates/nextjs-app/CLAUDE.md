# __APP__

<!-- One paragraph: what the app is and who uses it. -->

Next.js + Drizzle + Postgres 18; pnpm; Node 24. Follows https://github.com/ki4hrg/standards
(Next.js app profile). The `standards` plugin is enabled in `.claude/settings.json`; its `ship`
skill is how work lands. Design: `docs/SPEC.md` · how it's built: `docs/ARCHITECTURE.md` ·
deploy and env: `docs/DEPLOYMENT.md` · decisions: `docs/DECISIONS.md`. This Next.js is newer
than your training data: read the guide in `node_modules/next/dist/docs/` before using an API.

## Commands

- `pnpm dev`: needs `.env.local` (copy `.env.example`) and the local database below.
- `pnpm typecheck && pnpm lint && pnpm test`: all three pass before anything is called done.
- `pnpm db:generate --name <what>` after changing `lib/db/schema.ts`. Migrations are
  append-only; a backfill goes in the same migration.
- Local database: `docker run -d --name __APP__-db -e POSTGRES_USER=__APP__ -e POSTGRES_PASSWORD=change-me -e POSTGRES_DB=__APP__ -p 54329:5432 postgres:18-alpine`

## Rules that are easy to break

- **One write path.** Mutations go through `lib/<area>/`, which validates, checks permission,
  writes and audits in one transaction. Server actions (through `act()`) and MCP tools call it.
- **Guards.** `app/(app)/` is guarded by its layout. Server actions and anything under `app/api/`
  or `app/mcp` are not: each authenticates itself. Keep the guard table in
  `docs/ARCHITECTURE.md` current.
- **Errors meant for a person** are `AppError` subclasses, written in plain words.
- **UI:** tokens only (`app/globals.css`), never raw palette classes. Phone first, 44px targets.
  Check light, dark and phone width.

## Layout

<!-- A short map: where things live. Keep it to what a newcomer needs to find the rest. -->

- `app/(app)/` signed-in pages · `app/(auth)/` login · `app/api/` route handlers ·
  `app/mcp` MCP endpoint
- `lib/db/` schema, migrations · `lib/auth/` sessions, OIDC · `lib/<area>/` domain modules ·
  `lib/web/` `act()` and request helpers · `lib/env.ts` validated environment
- `components/ui/` shared primitives · `test/` Vitest on real Postgres (Docker must be running)
