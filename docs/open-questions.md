# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

1. **A profile for Node apps that aren't Next.js** (raised 2026-11-01 by a migration of a Fastify
   API + Vite SPA monorepo). Two existing apps use that shape: one because Next's route handlers
   can't serve WebDAV verbs (`PROPFIND`, `REPORT`, `MKCOL`). Proposed: a "Node service + SPA"
   profile that shares the Next.js profile's stack and rules, and replaces only its Next-specific
   mechanisms: a Fastify error handler mapping `AppError` to 4xx JSON in place of `act()`,
   per-route auth hooks, per-route body limits, and boot-time env validation in place of
   `instrumentation.ts`. Until then, those apps are audited against the core docs plus the
   stack-neutral parts of the Next.js profile.
2. **Node 22 → 24 inside migration sweeps.** It's a Phase 6 (stack) item, out unless John asks,
   and several repos are still on 22. Proposed: bring it into every sweep's scope, since it's
   small and low-risk; Postgres majors stay in Phase 6.
