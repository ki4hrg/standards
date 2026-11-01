# Profile: Laravel app

Laravel apps so far are Foundry work. This profile applies until Foundry's own standards replace
it. It is drawn from the most mature Laravel project and is less settled than the other
profiles: question it when it does not fit.

## Stack

- Laravel (current major), PHP pinned with `config.platform.php`, Livewire for interactive admin
  screens, Blade and plain JS where interactivity is light, Tailwind 4 via Vite.
- MySQL 8.4 or PostgreSQL, Redis for queues and cache.
- Pint, Larastan (level 5 or higher), Pest. One `composer check` script runs all three.

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

When the host pulls from git, CI builds front-end assets and publishes them on a deploy branch
(`deploy-staging`, `deploy-production`). The deploy branch is **merged into, never force-pushed**:
RunCloud's shallow pull fails on rewritten history. Production is a manual `workflow_dispatch` on
`main`.
