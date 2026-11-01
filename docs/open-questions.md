# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

Raised by the first Laravel migration (2026-11-01):

1. **Laravel production deploys: automatic or manual?** The Laravel profile says production is a
   manual `workflow_dispatch`, which came from one app where it stood in for a required reviewer
   GitHub Free can't enforce. The core rule for apps is that merging to `main` is the release.
   For an app with only production (no staging), proposed: merge-on-green → `main` → CI builds
   and merges into `deploy-production` automatically; `workflow_dispatch` stays for redeploys.
   Manual stays an option per repo, recorded in its `docs/DECISIONS.md`.
2. **Revision check for apps that aren't containers.** `deploy.md`'s `/api/health` and revision
   check cover containers only. Proposed for RunCloud apps: CI writes the commit into the deploy
   branch it publishes, a no-auth route reports `{ ok, revision }` (Laravel's `/up` stays), and
   the publish job waits for that revision to be serving.
3. **Front-end package manager for Laravel apps.** pnpm is a Next.js profile rule; the Laravel
   profile is silent. Proposed: npm is fine, moving to pnpm only when an advisory needs a
   per-advisory ignore (as `security.md` already says).
4. **Sensitive personal data as a sensitive path.** Proposed: add "health, children's or other
   sensitive personal data" to the `/security-review` trigger list in `workflow.md`, so it holds in
   every repo, not only where a CLAUDE.md lists it.
5. **Design phase on Tailwind 3 apps.** The token file and contrast check assume Tailwind 4's
   `@theme`. Proposed: a Tailwind 3 app does migration Phase 5 only after its Tailwind 4 upgrade
   (Phase 6), so views aren't converted twice.
