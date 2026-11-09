# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

## SQLite apps

The stack is PostgreSQL 18, and tests run against a real Postgres. A Next.js app on SQLite
(Prisma, raised by the pickems-scoreboard Phase 0 audit, 2026-11-09) fits neither. To decide:

- Does a SQLite app move to Postgres as a Phase 6 stack item, or may it stay on SQLite as a
  recorded exception (a small single-host app where one file is the whole backup)?
- Should the Next.js profile mention SQLite at all, or is it per repo?

**Until John decides:** the repo records SQLite as an exception in its `docs/DECISIONS.md`, and
its database tests run against a real SQLite file, created per run in a temp directory with the
migrations applied (`prisma migrate deploy`). That follows the reason behind the Postgres rule
(test on the engine production runs, not mocks) and the Laravel row. `node-check` needs no
change: leave `postgres-image` empty and no service starts or URL is exported; the suite sets
its own `file:` URL. A database test with no database still fails, never skips.
