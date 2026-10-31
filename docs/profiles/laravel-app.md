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
- Runner images pinned (`ubuntu-24.04`), bumped deliberately on a quiet week.

## Deploy (RunCloud)

When the host pulls from git, CI builds front-end assets and publishes them on a deploy branch
(`deploy-staging`, `deploy-production`). The deploy branch is **merged into, never force-pushed**:
RunCloud's shallow pull fails on rewritten history. Production is a manual `workflow_dispatch` on
`main`.
