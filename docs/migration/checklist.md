# Bringing a repo up to standard

A checklist for a session aligning one existing repo with these standards. Work through it in
order: the phases are sorted by how much harm each gap can do. A repo doesn't have to finish
every phase in one sweep; stopping after any phase leaves it better than it was.

## Ground rules

- **One repo at a time, one PR per phase** (a few if the phase is large), not one per fix:
  every merge is a build and deploy on GitHub's paid minutes. Never mix a safety fix with a
  refactor.
- **Phases 2 and 6 never get the `automerge` label.** They change how the app boots or stores
  data. John watches the first deploy. Back up the database first (`pg_dump -Fc`).
- Every PR still goes through `ship`: checks, `/code-review`, `/security-review` where it
  applies.
- Don't change behaviour the standards don't ask for. If something looks wrong but isn't covered,
  note it in the handoff.
- Record progress in the repo's `docs/HANDOFF.md`, using the block at the end, so the next session
  starts where this one stopped.

## Before the first repo (once)

- [ ] The standards repo is published and tagged `v1`.
- [ ] The repo's GitHub owner can call public reusable workflows. This is on by default; check
  under Settings → Actions → General → "Allow actions and reusable workflows".

## Before each repo

- [ ] Update the local standards clone: `cd ~/Projects/standards && git pull --ff-only`. (Run
  it from inside the clone; `git -C <path>` on a directory outside the session's working tree
  may be refused, notably from a worktree-isolated agent. Such an agent may not be able to read
  the clone at all, by any path; the main session reads it and passes on what's needed.)

- [ ] A recent Actions run in the repo actually **started** (green or red, not "job was not
  started"). Billing or a spending limit blocks every job in seconds, and merge-on-green can't
  tell that from a real failure. If runs are blocked, stop and tell John.
- [ ] **Ask John to confirm** the repo's Dockhand stack has **Force redeploy** and **Re-pull
  images** on, and whether its `/api/health` is reachable from GitHub (then `APP_HEALTH_URL` is
  set). Agents can't see Dockhand, so this is his answer, recorded in the sweep tracker.

## Phase 0: Audit and triage (no code changes)

- [ ] Run the `conform` skill. Save its report as `docs/plans/standards-conformance.md`, once
  John says yes.
- [ ] Get John's yes or no on each **candidate** rule from the CLAUDE.md triage.
- [ ] Run the dependency audit locally (`npm audit --audit-level=high`, `pnpm audit …`, or the
  profile's equivalent). Phase 1 makes it a gate, so whatever fails now will block Phase 1's
  own PR. Plan the fixes (see Phase 1).
- [ ] Agree with John which phases are in scope for this sweep. Phase 6 (stack) is out unless he
  says otherwise, except Node 24: a repo on an older Node moves to 24 in every sweep, as its own
  PR alongside Phase 2 (John watches the deploy). Record the scope in the handoff.

## Phase 1: Pipeline and safety

*Done when no unchecked change can reach `main` and every change is checked for vulnerable
dependencies.*

- [ ] Replace the workflow with the template caller (`templates/<profile>/.github/workflows/ci.yml`).
  Keep repo-specific jobs, but nothing may sit between `image` and `deploy` except checks. Move
  any e2e suite onto PRs only, or make it manual.
- [ ] Set the check's `scripts` to the ones the repo **has now** (often just `typecheck lint`; add a
  `typecheck` script running `tsc --noEmit` if missing). Each later phase adds what it creates:
  `test` in Phase 3, `db:drift` once real migrations exist, `check:contrast` in Phase 5 (unless the
  contrast check is a test that `test` already runs).
- [ ] A repo still on npm passes `package-manager: npm` to `node-check` and
  `package-managers: npm` to `security`. Moving to pnpm is Phase 6. A repo still on Node 22
  passes `node-version: '22'` (both workflows default to 24) until its Node 24 PR.
- [ ] CI runs on `pull_request`. `image` needs every check job.
- [ ] A repo with more than one image (a worker built from `Dockerfile.worker`) or a lockfile
  in a subdirectory gets one `image` or `security` job per image or directory, each listed in
  the `needs` of every job downstream of it and in `require-jobs` (`deploy.md`, Several images or
  lockfiles).
- [ ] **If the audit fails today**, the Phase 1 PR can't go green, and there's no PR CI yet for
  fix PRs to go through. So:
  - small fixes (`npm audit fix` without `--force`, `overrides` per `security.md`) go **in the
    Phase 1 PR**, listed in its description. Keep the `prisma` CLI and `@prisma/client` on the
    same version: `npm audit fix` can bump one without the other, and `prisma generate` then
    fails;
  - anything bigger (a framework major, a stack item) is its own PR **before** Phase 1, verified
    locally (typecheck, lint, build, audit, and a run of the app), and merged by John by hand.
    That PR gets no CI run (there's no PR CI yet). Checks needing a database run locally if the
    machine has Docker; otherwise on the deploy John watches.
  - **a hand merge still runs the repo's old push-to-main workflow.** If the repo has already
    moved into John's organization, that workflow pushes to the old owner's GHCR path, or to
    the new path while compose still pulls the old one, and fails or deploys nothing new. Before
    John merges, either disable it (`gh workflow disable <file> -R <owner>/<repo>`; the fix
    then deploys with Phase 1's first `main` run) or put the fix in the Phase 1 PR instead. If
    the template caller replaces it under the **same file name**, re-enable it after Phase 1
    merges (`gh workflow enable`): a workflow stays disabled when its file is replaced, and
    `main` gets no runs at all.
  - non-breaking fixes for *other* advisories still go in the Phase 1 PR, even ones the bigger
    PR's upgrade didn't touch. The bigger PR stays one change.
- [ ] `security` job; `.github/dependabot.yml` for each ecosystem; the GitGuardian app covers the
  repo.
- [ ] Add the PR template (`templates/<profile>/.github/pull_request_template.md`, where the
  profile has one) and `docs/claude-candidates.md` if missing: the PR template's checklist and
  `ship` both point new rules there from this PR on. Phase 4 sorts what it collects.
- [ ] `merge-on-green` job with `actions: write` and `checks: read`, and the `close-issues` job after it (as in the template). Run `scripts/repo-settings.sh owner/repo`
  (squash only, delete branch on merge, `automerge` label).
- [ ] Workflow `permissions:` are least-privilege.
- [ ] **Move the repo into John's organization** (`workflow.md`, Self-hosted PR runner), as its own
  step after the template caller is in. John does the transfer. In the same change:
  - point compose `image:` at `ghcr.io/<org>/<repo>`. CI starts pushing there by itself, while
    the old package stays where it was, so a compose file left alone keeps pulling the old image
    and every deploy still reports success;
  - check the GitGuardian app is installed on the organization, not only on John's personal
    account (once per organization), with this repo in its access. A repo moved out of the
    account's installation loses secret scanning with no warning. Then check the repo's next PR
    shows a GitGuardian check; merge-on-green waits only for app checks that exist, so a missing
    one doesn't fail anything;
  - check Settings → Actions is enabled. A transferred repo can arrive with Actions disabled, and
    then pushes and PRs start no runs at all, silently (a manual dispatch still works);
  - point the caller's `image:` input there too, if it names the image;
  - the deploy job passes `DOCKHAND_WEBHOOK_URL` and `DOCKHAND_WEBHOOK_TOKEN` by name, as the
    templates do. `secrets: inherit` passes nothing once the repo and the standards have different
    owners, and the deploy is refused. A repo with older names (`DOCKHAND_WEBHOOK_SECRET`,
    `WEBHOOK_URL` / `WEBHOOK_TOKEN`) needs John to set the new ones (`deploy.md`, Moving from
    older webhook settings);
  - check the Actions secrets, variables and environments arrived (they move with the repo), and
    give the deploy host's registry login access to the new package;
  - after the first deploy, check `/api/health` reports the new revision;
  - then set the repo variable `PR_RUNNER` to the runner's label (`workflow.md`). Until it moves
    and has that variable, its PR jobs use GitHub's runners.
- [ ] The image name `image.yml` pushes (default `ghcr.io/<owner>/<repo>`, lowercased) is the one
  compose pulls. If compose uses a different name, pass `image:` explicitly in the caller.
- [ ] The deploy step uses `dockhand-deploy.yml` (with the JSON success check), or deploy mode B
  is documented. John has confirmed the Dockhand stack has **Force redeploy** and **Re-pull
  images** on (Before each repo), and the `APP_HEALTH_URL` variable is set if `/api/health` is
  reachable from GitHub (`deploy.md`). If the app has no `/api/health` yet (it often has a
  `/healthz` or similar that queries the database and reports no revision), leave
  `APP_HEALTH_URL` unset until Phase 2 adds the route: set now, every deploy check fails. If it
  is already set, bringing the Phase 2 route forward instead is fine: `/api/health` (no auth, no
  DB) reporting `GIT_REVISION`, and the Dockerfile's `ARG`/`ENV GIT_REVISION`, as a small PR
  merged before Phase 1 (`image.yml` passes the build arg).
- [ ] **Verify:**
  - this PR's own run is green on the PR;
  - labelling it `automerge` merges it;
  - the dispatched `main` run builds and deploys;
  - the deploy job reports success.

  If jobs fail in seconds with "The job was not started because recent account payments have
  failed" (or a spending-limit message), that's billing: don't label, re-run or change code. Tell
  John.

## Phase 2: Runtime hardening (John watches the deploy)

*Done when the container runs as non-root, refuses to boot on bad config, and reports what it is
running.*

- [ ] **compose:**
  - no `build:`;
  - `pull_policy: always` on mutable tags;
  - `${VAR:?}` on every required secret;
  - no hard-coded credentials;
  - no localhost defaults for public URLs.
- [ ] **Postgres:**
  - `PGPASSWORD` beside a password-less `DATABASE_URL`;
  - PG18 volume at `/var/lib/postgresql`. An existing stack that pins
    `PGDATA=/var/lib/postgresql/data` with the volume at `.../data` keeps it, recorded as an
    exception in `docs/DECISIONS.md`: moving it means a dump and restore, for no gain. Only move it
    during a Postgres major-version upgrade, which needs the dump and restore anyway;
  - no published port unless something needs it.
- [ ] Healthchecks: app on `/api/health` (no auth, no DB, reports `GIT_REVISION`); DB with
  `pg_isready`; `depends_on: service_healthy`. An existing health route under another name
  (`/healthz`, `/health`, `/status`): point the compose and Dockerfile healthchecks at
  `/api/health` instead. Keep the old route only if something outside the repo polls it (an uptime
  monitor; ask John), and then say so in `docs/DEPLOYMENT.md`; otherwise remove it, and check the
  old path now answers 404: in an app with a client-side router it falls through to the SPA and
  answers 200, which a forgotten monitor reads as up (add it to the server's reserved 404s). A healthcheck
  that queries the database restarts the app when the database blips, which `depends_on` and
  `pg_isready` already cover.
- [ ] Once `/api/health` is deployed and reachable from GitHub, set the `APP_HEALTH_URL`
  variable (if it wasn't set in Phase 1), so every deploy checks the running revision.
- [ ] **Dockerfile:**
  - non-root user;
  - writable dirs `chown`ed before `USER`. **Existing volumes keep their old owner:** plan a
    one-off `chown` on the host, or the app fails to write after deploy;
  - `GIT_REVISION` build arg.
- [ ] Environment validated at boot (`instrumentation.ts` / settings class).
- [ ] Migrations, not `db push`, if the ORM already supports them, baselined as in `deploy.md`
  (Moving an existing app off `db push`). Check `.gitignore` doesn't exclude the migrations
  directory. Switching ORMs is Phase 6.
- [ ] `docs/DEPLOYMENT.md`: deploy mode, host architecture, exposure, backups.
- [ ] **Verify after deploy:**
  - `/api/health` reports the merged commit;
  - `docker exec <app> id` is not root;
  - the app can write to its volumes;
  - a missing secret fails `compose up` with its message.

## Phase 3: Trust boundaries

*Done when every input from outside is parsed and every entry point authenticates itself.*

- [ ] If the repo has no test runner, set one up first, per its profile (Next.js: Vitest on real
  Postgres via Testcontainers), as its own PR. Add `test` to the CI check's `scripts`. The
  refusal tests below need it. Converting existing mocked tests to real Postgres stays in
  Phase 6.
- [ ] Inventory every entry point:
  - server actions;
  - route handlers;
  - the MCP endpoint and each tool;
  - inbound email and webhooks;
  - public or token-link pages;
  - file uploads.
- [ ] Each one parses its input with zod (or the stack's equivalent) and authenticates and
  authorizes per call. Nothing relies on the layout guard alone.
- [ ] A route-guard table in `docs/ARCHITECTURE.md` (columns in `security.md`).
- [ ] Webhooks verify a signature or secret. Secrets never appear in logs, errors or MCP output.
- [ ] Refusals reach the person. Domain functions throw a typed, person-readable error (`AppError`
  or its subclasses) for everything a person can fix, not a plain `Error`; existing apps usually
  have many plain ones to convert. **One** place turns those into what the person sees, and
  anything else into a logged, generic failure. The profile says where:
  - Next.js: server actions return `AppError` messages through `act()`, never throw them (a
    thrown message shows as "Minified React error" in production); catches let `redirect()`
    through (`unstable_rethrow`); forms keep what was typed (`keepFormValues`), and use the kit's
    `ActionForm` once it exists.
  - Node service: one Fastify error handler maps them to a 4xx JSON `{ error }`; the SPA shows the
    message in place and keeps what was typed.
  - Laravel: validation errors and policies through Laravel's own handling.
- [ ] Tests cover the refusals: bad input, wrong user, wrong tenant.
- [ ] Database tests run in CI against a real database (Testcontainers, or `node-check`'s
  `postgres-image`), and fail rather than skip when they have none. Check the CI log's skipped
  count: a suite that skips without a database is green with most of it unrun.
- [ ] `/security-review` on the whole phase.

## Phase 4: Agent docs

*Done when CLAUDE.md is short, current, and says nothing the standards already say.*

- [ ] CLAUDE.md is about 150 lines or fewer, per the triage:
  - rules that duplicate or contradict a standard are dropped;
  - project facts and domain spec are moved to `docs/`;
  - accepted candidates are kept.
- [ ] Every path and command CLAUDE.md names exists. Stale facts are fixed or removed.
- [ ] **Fact-check:** a reviewer that didn't write the new CLAUDE.md and `docs/ARCHITECTURE.md`
  (a fresh session, or a read-only subagent: `workflow.md`, Sessions and subagents) checks
  every rule, path and behaviour they describe against the code. A rule described backwards
  gets an agent to rebuild the bug it prevents.
- [ ] A rule the triage marks as replaced by a later phase (for example, "replaced by
  `lib/env.ts`" before that file exists) stays, as a project fact, until that phase lands.
  Otherwise the detail it carries is lost.
- [ ] `docs/claude-candidates.md` exists. Rules John deferred are listed there.
- [ ] Plans referenced outside the repo (`~/.claude/plans/…`) are recovered into `docs/plans/` or
  the reference is removed.
- [ ] `.claude/settings.json` enables the standards plugin, with `autoUpdate` on its marketplace
  (as in the template). `AGENTS.md` is a one-line pointer
  (Next.js 16.3 or later: `agentRules: false` in `next.config.ts`, so `next dev` stops writing
  into it. Older Next doesn't write `AGENTS.md` and has no such option; add it when the repo
  reaches 16.3).
- [ ] `.github/pull_request_template.md`. `.env.example` is complete and matches the README.
- [ ] Any exception the repo relies on is stated in CLAUDE.md, for example direct pushes to
  `main` for an infra repo.

## Phase 5: Design and copy

*Done when the app follows the shared token names and dark mode, and its copy passes the
verbosity rules.*

An app still on Tailwind 3 does this phase only after its Tailwind 4 upgrade (Phase 6, brought
forward with John's yes): the token file and contrast check assume Tailwind 4's `@theme`, and
converting every view twice is waste.

- [ ] Token names from `design.md` are defined in the app's CSS. Components use them, not raw
  palette classes. This can be done screen by screen across several PRs.
  A shadcn/ui app renames its tokens to these, `components/ui` included, with no alias layer
  (mapping in `design.md`).
- [ ] Dark mode: system default, a light/dark/system toggle, no flash on load.
- [ ] The contrast check runs in CI (`check:contrast`, or a test inside `test`).
- [ ] A full `ui-verbosity-reduction` pass, including casing. Renamed terms are made consistent
  across the app.
- [ ] Destructive actions confirm inline. One primary button per screen. Phone width works.
- [ ] A web app manifest (`standalone`, scope and start URL `/`), served without sign-in.
- [ ] Everything a user can create can also be removed (delete, archive, or a soft delete).
- [ ] If the repo has a Playwright suite, it includes the WebKit phone check (`design.md`).
- [ ] **Verify:** screenshots of the main screens in light, dark, and at 360px.

## Phase 6: Stack alignment (only when John asks, per repo)

Each item gets its own plan in `docs/plans/` before any code.

**Exception:** a stack item forced by a critical or high advisory (a framework major whose older
versions won't be patched, or moving npm → pnpm to ignore an unfixable advisory) comes forward as
its own PR, with its plan, whenever it's needed. The rest of Phase 6 stays out of scope. John
watches its deploy, as for Phase 2.

A framework major changes runtime behaviour that types and the build don't catch. Its plan has a
**Runtime behaviour changes** section: go through the upgrade guide for defaults and semantics that
changed (form state after a server action, request body size limits, caching, middleware) and say
what each means for this app. If one would break a rule in `design.md` or `security.md` (forms
keeping what was typed, uploads arriving whole), fix it in the same PR.

After a framework major merges, reinstall dependencies from the lockfile in every checkout and
worktree (`pnpm install --frozen-lockfile` or `npm ci`) and confirm the version (`next --version`)
before building or smoke testing. A checkout that still has the old `node_modules` builds the old
framework without complaint. Stop servers left running from before, so the smoke test reaches the
new build.

- [ ] Package manager pnpm. (Node 24 is done in every sweep, alongside Phase 2.)
- [ ] Prettier with defaults, in its own formatting-only PR (nothing else in the diff), with the
  commit added to `.git-blame-ignore-revs`.
- [ ] Once the shared component kit exists, it replaces the app's own Button/Card/etc., screen by
  screen.
- [ ] Prisma → Drizzle with real migrations. The biggest item: generate a baseline migration from
  the live schema first, and prove a round-trip on a copy of production data.
- [ ] Auth library → own sessions plus `openid-client`, keeping the OIDC rules.
- [ ] MCP → the official SDK, with `snake_case` tool names. Use the shared OAuth package once it
  exists.
- [ ] Tests on real Postgres where they were mocked. (A missing test runner is set up in Phase 3.)

## Close out

- [ ] Run `conform` again, against the audit plan (`docs/plans/standards-conformance.md`). Each
  remaining gap is either an `agent-found` issue or a recorded, accepted exception in
  `docs/DECISIONS.md`. A gap only John can settle (removing an old database volume, say) is an
  `agent-found` issue that says it's waiting on his decision.
- [ ] Write the close-out status into the audit plan (phases done with their PRs, exceptions,
  open issues), then delete `docs/HANDOFF.md`: the sweep is over, and the plan keeps the record.
- [ ] Update the sweep tracker. It names private repos, so it is not in this public repo: it is
  `private/sweep-tracker.md` in John's local clone (gitignored). A session without it reports
  the repo's phase status for John to record.

## Other profiles

- **Python service:** phases 0–4 apply as written (ruff, pytest, uv lock; `pydantic-settings`
  for phase 2). Phase 5 only if it has a UI.
- **WordPress plugin:** phase 1 means the plugin CI and tag-release workflow from its profile,
  plus `security.yml` with `composer npm`. Skip phase 2. Phase 3 means nonces, capabilities,
  sanitize/escape and REST `permission_callback`.
- **Laravel app:** phase 1 per its profile, from `templates/laravel-app/` (no `image` or Dockhand
  items; `scripts` lists the composer scripts the repo has now). Phase 2 is the deploy branch with
  assets built in CI, and the revision route (both in its profile). Phase 3 uses Laravel's
  validation and policies, and checks Livewire's persistent middleware (its profile).
- **Node service:** phases as written, using the Next.js template's caller without the
  Next-specific scripts, `postgres-image` on `node-check` if its tests read a database URL, and a
  `build` script first in `scripts` when a workspace package must be built before typecheck.
  Phase 3 per its profile (one error handler, per-route auth and body limits).
- **Infra/ops repo:** phase 0 and phase 4 only. Direct pushes to `main` are allowed.

## Handoff block

Paste into the repo's `docs/HANDOFF.md` and keep it current:

```markdown
## Standards sweep — <date>

Standards version: v1 · Scope agreed with John: phases <…> (stack: <in/out>)

| Phase | Status | PRs | Notes |
|---|---|---|---|
| 0 Audit | done / partial / — | | report: docs/plans/standards-conformance.md |
| 1 Pipeline | | | |
| 2 Runtime | | | |
| 3 Boundaries | | | |
| 4 Agent docs | | | |
| 5 Design/copy | | | |
| 6 Stack | | | |

Verified: <what was run and seen, with dates>
Not verified: <what wasn't, and why>
Open decisions for John: <yes/no questions>
Resume at: <phase and checklist item>
```
