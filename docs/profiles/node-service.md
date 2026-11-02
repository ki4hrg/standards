# Profile: Node service

A Node web service that isn't Next.js: a Fastify API, optionally serving a separately built
single-page app. Choose it when Next.js can't do the job (for example, Next's route handlers can't
serve WebDAV methods such as `PROPFIND`, `REPORT` and `MKCOL`), or for a service with no UI
of its own (an MCP server). Record the reason in the project's `docs/DECISIONS.md`. Otherwise a
web app with a database uses the Next.js profile.

The core docs (`../core/`) apply in full. So does most of the Next.js profile
(`nextjs-app.md`): this profile says what is the same and what replaces the Next-specific parts.
There is no template yet.

## Stack

As the Next.js profile (Node 24, pnpm, TypeScript strict with `noUncheckedIndexedAccess`,
PostgreSQL 18, Drizzle, zod 4, own sessions plus `openid-client`, Vitest on real Postgres,
ESLint and Prettier, the MCP SDK), except:

| Piece | Choice |
|---|---|
| Server | Fastify 5 |
| SPA (optional) | React + Vite, Tailwind CSS 4 with the shared tokens in its global stylesheet (`../design.md`) |
| Shared code | A workspace package of zod request and response schemas, used by server and SPA |
| Tests | Vitest on real Postgres: Testcontainers, or a database URL that CI provides through `node-check`'s `postgres-image`. Database tests fail, never skip, when CI has no database. |

## Layout

A pnpm workspace when there is an SPA:

```
apps/server/src/
  index.ts          boot: load env (zod), build the app, listen; exit 1 on any failure
  app.ts            plugins, hooks, routes, error handler, SPA fallback
  env.ts            the env schema
  routes/           REST routes, one plugin per area
  mcp/              /mcp transport, tool registration, tools
  services/         the one write path (validation, permission, scope, write, audit)
  db/               schema, queries (taking the scope), migrations
  auth/             sessions, tokens, OIDC
apps/web/src/       SPA: routes, lib/api.ts (fetch wrapper), components/ui/
packages/shared/    zod schemas and inferred types
```

A service with no SPA keeps the `apps/server/src/` shape at the repo root.

## Rules

From the Next.js profile, unchanged: **one write path**, **domain functions take an executor**,
**scope every query**, **errors meant for a person are typed** (`AppError` or subclasses, for
everything a person can fix), **API routes refuse with JSON**, **dates through one helper**,
**background jobs take an advisory lock**, **Claude in the product**.

In place of the Next-specific rules:

- **Boot validates before listening.** `index.ts` parses the environment with zod and exits
  non-zero on a missing or malformed value, before `listen`. (The Next.js profile does this in
  `instrumentation.ts`.)
- **Every route authenticates itself.** A global `onRequest` hook may resolve who is calling, but
  that isn't a check. Either each route plugin has a `preHandler` guard, or each handler calls one
  (`requireActor`, `requireAdmin`) that answers 401 or 403 JSON. `/mcp` takes a bearer token;
  WebDAV routes take per-device tokens. The route-guard table in `docs/ARCHITECTURE.md` covers
  every prefix.
- **A test proves no route was missed.** An `onRoute` hook records every registered route; the
  test calls each one signed out and expects 401, except a public list with a reason per entry.
  An entry for a route that no longer exists fails too. Required with per-handler guards, where
  one forgotten call is easy; worth having either way.
- **CSRF:** with cookie sessions, every non-GET `/api` request checks `Origin`.
- **One error handler.** `setErrorHandler` maps an `AppError` to its 4xx with
  `{ "error": "<plain message>" }`, a failure to parse the **request** to 400, and anything else
  to a 500 with a generic message, logged with detail and never echoed. A zod error from parsing
  a stored row or an upstream response is a server fault: 500, not 400. Without a handler,
  Fastify's default echoes the error's message on a 500, database driver text included. Routes don't each map errors; that's what
  `act()` does for Next.js.
- **Body limits are per route.** Keep Fastify's global `bodyLimit` at its default. A route that
  takes large bodies (uploads, imports) raises its own limit and authenticates first
  (`../core/security.md`).
- **Serving the SPA:** `@fastify/static` serves the built SPA. The not-found handler answers JSON
  404 for the server's prefixes (`/api`, `/mcp`, WebDAV, `/.well-known`) and for non-GET requests,
  and `index.html` for any other GET (client routing).
- **The SPA shows refusals in place.** Its fetch wrapper turns `{ error }` into an error carrying
  the message; forms show it beside the form and keep what was typed. A 401 on any call signs the
  person out client-side.
- **Strict CSP:** `default-src 'self'` with no inline script or style, which suits a built SPA.
  The no-flash theme script is then an external, render-blocking `<script src>` (`../design.md`).

## Scripts

`typecheck`, `lint`, `test`, `db:drift`, and, when there is an SPA, the contrast check
(`check:contrast`, or a test inside `test`), as in the Next.js profile. In a workspace, a `build` of the shared package runs first (list it first in
`node-check`'s `scripts`).

## Build and deploy

As `../core/deploy.md`: image built in CI, Dockhand, `/api/health`. The Dockerfile has a build
stage (install, build the shared package, the SPA and the server) and a runtime stage (production
install of the server's dependencies only, the built SPA copied into the server's static
directory), runs as `node`, and its entrypoint applies migrations and then `exec`s the server.
