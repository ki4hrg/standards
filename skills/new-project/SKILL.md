---
name: new-project
description: Start a new project that follows John's engineering standards — scaffold from the right stack profile (Next.js app, Python service, WordPress plugin, Laravel app), wire up the standard CI/deploy workflows, agent docs and repo settings. Use when John asks to create, start, scaffold or bootstrap a new app, service, plugin or repo.
---

# New project

The standards live in this plugin's root, two directories up from this file. Read before
scaffolding:

- `docs/decisions.md`: what is decided, and why.
- `docs/profiles/<profile>.md` for the stack.
- `docs/core/` (workflow, agent-docs, security, deploy) and, for web apps, `docs/design.md` and
  `docs/mcp.md`.

Follow them as written. Where they are silent, choose the simplest thing and mention it in the
summary. Don't add conventions of your own to the new project's CLAUDE.md; propose them in
`docs/claude-candidates.md`.

## 1. Settle the basics

Ask only for what the request doesn't already say, in one AskUserQuestion call:

- Name (the repo name; lowercase, hyphenated) and a one-line purpose.
- Profile: Next.js app (default for anything with a UI and a database), Python service,
  WordPress plugin, Laravel app.
- Owner: `ki4hrg` (personal) or a Foundry org/account.
- Deploy host architecture (amd64 or arm64) and exposure (published port, or the proxy's external
  network). Containers only.
- Needs: sign-in (own accounts, OIDC), MCP for Claude, background jobs, email in or out.

## 2. Scaffold

Work in a new directory beside the other projects. Templates are in `templates/<profile>/`.
Replace `__APP__` with the name and `__OWNER__` with the GitHub owner (lowercase) in every
copied file.

**Next.js app**

1. `pnpm create next-app@latest <name> --ts --app --eslint --tailwind --no-src-dir --import-alias "@/*" --use-pnpm --skip-install`
2. Copy `templates/nextjs-app/` over it, keeping the template's version of any file both have.
3. `package.json`:
   - `packageManager` (current pnpm) and `"engines": { "node": ">=24" }`;
   - the scripts from `docs/profiles/nextjs-app.md`;
   - dependencies: `drizzle-orm postgres zod @node-rs/argon2 openid-client`;
   - devDependencies: `drizzle-kit vitest @testcontainers/postgresql tsx esbuild`.
   Pin exact versions for Next, Drizzle and the auth libraries.
4. `tsconfig.json`: add `"noUncheckedIndexedAccess": true`. `next.config.ts`:
   `output: 'standalone'`.
5. Add:
   - `drizzle.config.ts` (schema `lib/db/schema.ts`, out `lib/db/migrations`);
   - `lib/db/client.ts`;
   - `lib/db/migrate.ts`, which applies migrations with `drizzle-orm/postgres-js/migrator` and exits;
   - `vitest.config.ts`, with a global setup that starts Postgres through Testcontainers and runs
     the migrations;
   - one test that proves the database round-trips.
6. Root layout: render `<ThemeScript />` in `<head>`, put `suppressHydrationWarning` on `<html>`,
   and import `globals.css`. Replace the starter page with a minimal one that uses tokens.
7. Sign-in and MCP: until the shared packages exist (`docs/mcp.md`), copy the implementation from
   the most recent of John's apps that has them. Ask which one if it isn't obvious. Record the
   source in `docs/ARCHITECTURE.md`.
8. Remove the create-next-app README boilerplate. Write a short README: what it is, how to run it
   locally, link to `docs/`.

**Python service**: `uv init --package <name>`, then add `ruff` and `pytest` as dev dependencies,
`pydantic-settings`, a `Dockerfile` per the profile, and `templates/python-service/`.

**WordPress plugin / Laravel app**: follow the profile. Copy the release workflow, bump script
and updater from the reference plugin it names; ask John for its path.

Every profile gets:
- `.github/dependabot.yml` for its ecosystems;
- `.github/pull_request_template.md`;
- `.env.example` when it reads env vars;
- `.claude/settings.json` enabling this plugin;
- a CLAUDE.md under 150 lines in the shape of `templates/nextjs-app/CLAUDE.md`.

## 3. Verify

Run everything CI will run (for Next.js: `pnpm install`, then `typecheck lint test db:drift
check:contrast`, then `pnpm build`) and `docker build .` if Docker is available. Fix failures
before going on. Report what you ran and what you could not run.

## 4. Publish (ask first)

Creating a GitHub repo is outward-facing. Show John the name, owner and visibility (private
unless he says otherwise), and wait for a yes. Then:

1. `git init -b main`, commit (`chore: scaffold from standards`), `gh repo create <owner>/<name>
   --private --source . --push`. A project before its first deploy may push to `main` directly.
2. `scripts/repo-settings.sh <owner>/<name>` from this plugin's root.
3. Tell John what is left for him to set:
   - `DOCKHAND_WEBHOOK_URL` and `DOCKHAND_WEBHOOK_TOKEN`;
   - the `APP_HEALTH_URL` variable (the public `/api/health` URL), so the deploy job checks
     what's serving;
   - the GitGuardian app's repository access, if it isn't set to all repos;
   - the GHCR package visibility after the first image push;
   - the Dockhand stack itself, with **Force redeploy** and **Re-pull images** on.

## 5. Summary

List what was created, the choices made where the standards were silent, what was verified, and
the remaining manual steps.
