# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

1. **Dependabot and framework majors** (raised 2026-11-01 by the first Laravel migration).
   Dependabot already ignores Node, Postgres and `@types/node` majors as stack decisions. A
   framework major (Laravel, Livewire, Tailwind, Vite, Next.js) also needs a plan with a
   runtime-behaviour section (migration Phase 6), and its Dependabot PR either sits red or
   invites a merge without one. Options: ignore framework majors in every template's
   `dependabot.yml` and track each as an issue when it ships; or keep the PRs as a notice and
   never merge them without a plan.
