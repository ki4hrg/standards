# Profile: Next.js app

The default for a web app with a database. Start from `templates/nextjs-app/` (the `new-project`
skill does this). The core docs (`../core/`) apply in full.

## Stack

| Piece | Choice |
|---|---|
| Runtime | Node 24 (`engines`, Dockerfile, CI) |
| Package manager | pnpm, pinned with `packageManager` in `package.json`; lockfile committed; build-script approvals in `pnpm-workspace.yaml` |
| Framework | Next.js, current major, App Router, `output: 'standalone'` |
| TypeScript | `strict` plus `noUncheckedIndexedAccess` |
| Database | PostgreSQL 18, Drizzle ORM with the `postgres` (postgres-js) driver |
| Validation | zod 4 |
| Auth | Own sessions (argon2 via `@node-rs/argon2`), `openid-client` for OIDC |
| Styling | Tailwind CSS 4 with the shared `@theme` tokens (`../design.md`) |
| Tests | Vitest against real Postgres (`@testcontainers/postgresql`). Needs Docker; on a dev machine without it, CI runs the database tests (the `ship` skill). |
| Lint | ESLint with `eslint-config-next` and `eslint-config-prettier` |
| Format | Prettier, default settings (no config file beyond `.prettierignore`) |
| Components | The shared kit in `components/ui/` (`../design.md`), styled only through the tokens. Not built yet |
| MCP | `@modelcontextprotocol/sdk` (`../mcp.md`) |

Pin exact versions for anything whose upgrades need care (Next, Drizzle, the Anthropic SDK, auth
libraries), and upgrade them on purpose.

## Scripts

Every app has these, which CI calls:

```json
{
  "dev": "next dev",
  "build": "next build",
  "typecheck": "tsc --noEmit",
  "lint": "eslint . && prettier --check .",
  "format": "prettier --write .",
  "test": "vitest run",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "tsx lib/db/migrate.ts",
  "db:drift": "drizzle-kit generate --name=drift-check && git diff --exit-code --stat -- lib/db/migrations && test -z \"$(git status --porcelain -- lib/db/migrations)\"",
  "check:contrast": "tsx scripts/check-contrast.ts"
}
```

`db:drift` fails if `schema.ts` has changes with no migration.

## Layout

```
app/
  (app)/            signed-in pages; the layout authenticates
  (auth)/           login, setup, OIDC callback
  api/              route handlers; each authenticates itself
  api/health/       health endpoint (no auth)
  mcp/              MCP endpoint
  oauth/, .well-known/   OAuth server for MCP clients
lib/
  db/               schema.ts, migrations/, migrate.ts, client
  auth/             sessions, passwords, oidc
  <area>/           domain modules: the one write path
  web/              act() wrapper for server actions, viewer/context helpers
  env.ts            validated environment
components/
  ui/               shared primitives built on tokens
docs/               see ../core/agent-docs.md
test/               Vitest
instrumentation.ts  validates env at boot; starts jobs
```

## Rules

- **One write path.** Every mutation goes through a function in `lib/<area>/` that validates
  input, checks permission and scope, writes, and audits, all in one transaction. Server actions
  and MCP tools both call it; neither writes to the database directly.
- **Domain functions take an executor** (database or transaction), so writes compose into one
  commit.
- **Scope every query.** If the app has tenants, households or properties, every domain call takes
  the scope and every query filters by it. A soft-deleted row is filtered the same way.
- **Server actions are public endpoints.** Wrap them in `act()`: authenticate, parse with zod, turn
  an `AppError` into a message for the form, revalidate.
- **Let `redirect()` and `notFound()` through.** They work by throwing, and Next 16 rejects the
  action's promise with that error. Any `catch` around an action or its result (in `act()` and in
  the client code that awaits it) calls `unstable_rethrow(err)` from `next/navigation` first.
  Otherwise a save that redirects is reported as a failure.
- **Errors meant for a person** are `AppError` subclasses (`ValidationError`, `ForbiddenError`,
  `NotFoundError`) in plain words, **returned** to the form by `act()`, never thrown to the client.
  Anything else is a bug and is logged, not shown, so `act()` only helps if the domain function
  throws an `AppError` for **everything a person can fix** (a missing field, a clash, a state that
  doesn't allow the change). A plain `Error` for one of those reaches the person as a generic
  failure; review each new `throw` in `lib/` for this. (In production, React replaces the message of
  anything thrown from a server action with "Minified React error", so a thrown message never
  reaches the person.)
- **Forms keep what was typed when the server refuses.** React 19 resets a `<form action>` after
  every action. Every form that stays on screen gets `onReset={keepFormValues}`
  (`lib/keep-form-values.ts` in the template); a form that should clear after a success cancels
  the reset only on refusal.
- **Request body size:** keep Next's proxy body limit (`proxyClientMaxBodySize`) at its default or
  lower. It applies to every route the proxy matches, signed in or not, so raising it for uploads
  lets anonymous requests buffer large bodies anywhere. Exclude routes that take large bodies
  (uploads, inbound email and other webhooks) from the proxy matcher instead, and have each
  enforce its own limit (`security.md`: uploads authenticate first; signed webhooks cap
  `Content-Length`, then verify). Check every such route before lowering the limit: removing a
  raised one cuts their bodies at the default and breaks them.
- **API routes refuse with JSON.** Routes outside the layout guard and anything a client calls with
  `fetch` return 401/403 JSON, never a redirect to sign-in (the auth library's or a
  `requirePermission`-style helper's): `fetch` follows the redirect to a 200 page and the client
  reports success. Exclude them from any auth proxy that redirects.
- **Dates** shown to the user are computed in the user's time zone, through one date helper module.
- **A failure in `instrumentation.ts` exits the process.** Next only logs a throw from
  `register()` and keeps running without serving, so catch, log the message and
  `process.exit(1)` (as the template does).
- **Background jobs** start from `instrumentation.ts` and take a Postgres advisory lock, so two
  instances never run the same job at once.
- **Claude in the product:** use the current model ID explicitly, pin the SDK, and degrade
  gracefully when no API key is set. Tests never call a model; they pass a fake.

## Migrations

- `pnpm db:generate --name <what>` after changing `lib/db/schema.ts`. Migrations are append-only;
  never edit one that has shipped.
- A backfill goes in the same migration as the schema change it needs.
- Applied by `docker-entrypoint.sh` (a separately bundled `dist/migrate.cjs`) before the server
  starts. `output: 'standalone'` only traces what the app imports, so the migrator is bundled with
  esbuild in the Dockerfile.
- CI runs `db:drift`.

## Environment

`lib/env.ts` parses `process.env` with zod once, and the app imports the result. It is called from
`instrumentation.ts`, so a bad environment stops the boot with a readable message.
`PUBLIC_BASE_URL` is the external origin; OAuth discovery and absolute links are built from it.
