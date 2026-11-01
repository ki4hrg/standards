# Profile: Laravel app

Laravel apps so far are Foundry work. This profile applies until Foundry's own standards replace
it. It is drawn from the most mature Laravel project and is less settled than the other
profiles: question it when it does not fit.

## Stack

- Laravel (current major), PHP pinned with `config.platform.php`, Livewire for interactive admin
  screens, Blade and plain JS where interactivity is light, Tailwind 4 via Vite.
- MySQL 8.4 or PostgreSQL, Redis for queues and cache.
- Pint, Larastan (level 5 or higher), Pest. One `composer check` script runs all three.
- Front-end packages with npm (lockfile committed). Move to pnpm only when an advisory needs a
  per-advisory ignore, which npm can't do (`../core/security.md`).

## CI

- On every PR: Pest against a real database service container, Pint `--test`, Larastan, and
  `security.yml` (composer audit, npm audit); GitGuardian for secrets.
- The reusable `php-check.yml` runs the composer scripts, then the front-end build so a broken
  Vite build fails the PR. The caller is `templates/laravel-app/.github/workflows/ci.yml`, with
  `merge-on-green` and `close-linked-issues` as in every profile; there is no image job.
- The test database matches production's engine and major (`database-image`: `mysql:8.4`,
  `mariadb:11.4`, …): MySQL and MariaDB differ in JSON, collations and DDL. SQLite `:memory:`
  may stay in `phpunit.xml` for quick local runs; the job's environment overrides it in CI.
- Runner images pinned (`ubuntu-24.04`), bumped deliberately on a quiet week.

## Deploy (RunCloud)

RunCloud pulls a git branch. CI builds the front-end assets and publishes them on a deploy branch
(`deploy-production`, plus `deploy-staging` where there is a staging site); RunCloud never builds.

- **The deploy branch is merged into, never force-pushed:** RunCloud's shallow pull fails on
  rewritten history. If it ever needs a reset, delete it and let the next run recreate it.
- **Merging to `main` is the release.** After `merge-on-green` merges, the dispatched `main` run
  checks, builds and merges into `deploy-production`. `workflow_dispatch` on `main` redeploys. A
  repo that wants a manual production gate records it in its `docs/DECISIONS.md`.
- **Revision check:** the publish job writes the commit into the deploy branch (a `REVISION`
  file), a no-auth route returns `{ ok, revision }` from it (Laravel's `/up` stays as it is), and
  the job waits for the deployed commit, or a later one, to be serving. It fails otherwise:
  RunCloud's own status doesn't say which commit is live. The route, in `routes/web.php`:

  ```php
  // No auth, no database: says which commit this release is (REVISION is written by CI).
  Route::get('/api/health', fn () => response()->json([
      'ok' => true,
      'revision' => is_file(base_path('REVISION')) ? trim(file_get_contents(base_path('REVISION'))) : null,
  ]));
  ```

- The reusable `runcloud-deploy.yml` does all of this (the template's `deploy` job). Set the
  `APP_HEALTH_URL` variable to that route's public URL, and point RunCloud's Git deployment at
  `deploy-production` with its GitHub webhook on push. RunCloud's deploy script drops any
  `npm` build step: the assets arrive built.
- Migrations and seeders run in RunCloud's deploy script (`php artisan migrate --force`), after
  the pull.
