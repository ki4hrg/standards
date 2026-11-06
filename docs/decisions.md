# Decisions

Every standard in this repo, the decision behind it, and its provenance. Provenance matters
because a survey of my projects (October 2026) found that many conventions repeated across repos
were never decided by me: an agent wrote them once and they spread by copying. A convention is a
standard only if it is listed here.

Provenance key:
- **Decided**: chosen by me in the standards interview (2026-10-31), including the follow-up
  rounds on rules raised by the first migration pilot and on the open questions.
- **Established**: an earlier explicit decision of mine, usually made after an incident, and
  already consistent across projects.
- **Default**: proposed during the interview without objection; easy to revisit.

## Workflow

| Standard | Provenance | Why |
|---|---|---|
| Every app change goes through a PR. Direct pushes to `main` only for infra/ops repos, single-file utilities, projects before first deploy, and docs-only changes. | Decided | PRs are where checks and review run. The exceptions are places where that adds cost without catching anything. |
| Squash merge only; delete branch on merge. | Decided | One commit per change on `main`, easy to revert and bisect. Merge method had been chosen ad hoc. |
| One branch per PR: after a PR merges, new work starts on a new branch from `origin/main`; a merged branch is never reused. No stacked PRs by default. | Decided | Follow-up PRs from an already squash-merged branch repeated the old changes and conflicted with them. Fixes squash's main failure mode instead of switching to merge commits. |
| PR titles are Conventional Commits; the title becomes the squash commit subject. Branch commits are free-form. | Decided | A consistent `main` history. The earlier "Conventional Commits" rules in some repos were agent boilerplate and were not followed. |
| PRs merge themselves when CI is green: the agent adds an `automerge` label; the `merge-on-green` workflow merges the tested commit and starts the deploy. Agents don't merge. No personal token. | Decided | Agents had been merging seconds after opening a PR, before CI ran. GitHub's native auto-merge waits only for *required* checks, which private repos on the free plan cannot have. |
| A check that can't run locally (memory, no Docker) isn't a pass: the PR opens without `automerge`, and the label goes on once CI is green. | Decided | First migration pilot: `tsc` on a large Prisma client ran out of memory on a small dev host. |
| Docker on dev machines is recommended, not required. Without it, database checks (migrations, Testcontainers, smoke runs) run in CI, or on the deploy John watches for a PR made before the repo has PR CI. | Decided | A dev host had neither Docker nor Postgres; CI runners have Docker. |
| A GitHub billing or spending-limit failure ("job was not started") stops the work: no label, no re-runs, no code changes; tell John. | Decided | First migration pilot: billing blocked every job for hours, and merge-on-green can't tell that from a real failure. |
| The dependency audit covers dev dependencies too. Clear an advisory by upgrading, then `overrides`, then (only if no fix exists and it doesn't apply) a recorded per-advisory ignore. npm has no such ignore, so an npm repo that needs one moves to pnpm. | Decided | Build tools run in CI and on dev machines, and some ship in the image. Raised in the first migration pilot. |
| Migration: a repo whose audit already fails fixes small things inside its Phase 1 PR, and bigger ones (a framework major) in a PR before Phase 1 that John merges by hand. A stack item forced by a critical/high advisory comes forward from Phase 6 as its own PR. | Decided | Otherwise Phase 1 can never go green, and the fixes have no CI to go through. Raised in the first migration pilot. |
| Before opening a PR the agent runs `/code-review` on its diff and fixes what it finds; `/security-review` too when the diff touches a sensitive path. | Decided | Nothing is reviewed by a person before merging, so review happens in the session. |
| Code holding health, children's or other sensitive personal data is a sensitive path for `/security-review`, in every repo; a repo's CLAUDE.md may add its own paths. | Decided | The first Laravel migration holds minors' medical data, and the core list didn't cover it. Decided 2026-11-01. |
| Issues are the unit of work (PR says `Closes #n`). A plan in `docs/plans/` exists only when the work needs more than one PR or session, linked from its issue; never only in `~/.claude/plans/`. | Decided | Sessions already start from issues. Several CLAUDE.md files pointed at plan files that no longer exist. |
| Follow-ups an agent finds and doesn't fix become issues labelled `agent-found`, for John to triage. Agents may open these without asking (a permission rule allows exactly `gh issue create --label agent-found`). | Decided | Follow-ups noted in PR descriptions were never seen again. |
| A session that stops partway through an issue hands off in a comment on the issue. `docs/HANDOFF.md` only for multi-issue efforts (a migration sweep). | Decided | The handoff sits next to the work it describes. |
| Dependabot PRs are merged by hand from the PR list once CI is green; their titles are Conventional Commits (`chore(deps): …`, set by `commit-message` in `dependabot.yml`). | Decided | Dependabot-triggered workflows get a read-only token, so `merge-on-green` can't merge them; a `pull_request_target` workflow or a personal token would add risk for little gain. Untitled, they failed the title check (first migration pilot). |
| A PR that changes `.github/workflows/` is merged by a person; `merge-on-green` leaves it open with a warning instead of failing. | Decided | GitHub refuses a merge by the workflow token that changes a workflow file, and that token can't be granted the `workflows` permission. Found in a migration sweep: labelled Actions bumps sat green with a red merge job. A GitHub App or personal token with that permission would add a credential for a few merges a month (same reasoning as the Dependabot row above). Recorded 2026-11-02. |
| GitHub stays on the free plan; `merge-on-green` stands in for required checks and native auto-merge. | Decided | It works and was proven in the first migration pilot. Revisit if it causes trouble. |
| A private repo's PR jobs (check, audit, PR image build) run on a self-hosted runner when the variable `PR_RUNNER` (set on John's organization) names its label; everything that holds a write token or secret (`merge-on-green`, `close-linked-issues`, the image push on `main`, deploy) stays on GitHub's runners, as do public repos and fork PRs. The runner is isolated from the LAN and starts every job from nothing (just-in-time registration, a fresh rootless Docker daemon, no build cache). | Decided | Three migration sweeps used about 90% of the month's Actions minutes in six days (2026-11-06), two thirds of it on PR runs. PR code includes dependency updates nobody has read, so the runner that executes it holds nothing worth stealing and keeps nothing for the next job. Public repos have free minutes, and a self-hosted runner must never run a stranger's fork: a fork's PR can name the runner's label in its own copy of the workflow, so the runner is registered only where public repos can't reach it (private repos, or an org runner group with public repos off), and the templates' condition is not the control. |
| Adding the `automerge` label never re-tests a commit: the label's run skips the checks, and `merge-on-green` (`require-jobs`) merges only if they passed on that commit in another run. A run still testing the commit merges it when it finishes. | Decided | Each PR ran its full pipeline twice, once on open and again on the label, and the cancelled first runs were billed too. 2026-11-06. |
| The `main` run after `merge-on-green` skips check and audit when the merged commit's tree is exactly the one the PR tested and it is still `main`'s head (`pass-tested`); it builds, pushes and deploys. A push to `main` or a manual run checks everything. | Decided | The same files were tested twice, minutes apart. Comparing trees, not commits, catches a merge that brought in something else from `main`. 2026-11-06. |
| `merge-on-green`'s title check and merge are one job. | Decided | Every job bills at least a whole minute; the title check takes seconds. 2026-11-06. The audit stays its own job (on the self-hosted runner for PRs, it costs nothing). |
| A migration sweep batches each phase into one PR, or a few, not one per fix. | Decided | Every merge is a build, push and deploy on GitHub's runners. A safety fix still never shares a PR with a refactor. 2026-11-06. |
| App repos move into John's GitHub organization as they're swept; the self-hosted runner serves the organization, with an organization-owned token that can only manage runners and a runner group closed to public repos. | Decided | Repo-level runners need a token with Administration: write, which can also make a repo public or delete it, held on a machine that runs unreviewed code. Organization runners need only the runner permission, and one pool serves every repo. Decided 2026-11-06. The standards repo stays where it is. |
| Before a private repo goes public: scan its full history for secrets (gitleaks) and its docs for hostnames, addresses and private details. | Decided | Publishing exposes the whole history, and it can't be recalled. Public repos are the fallback when minutes run short (2026-11-06). The runner group already refuses public repos, so the runner needs no change. |
| App repos are unversioned: merging to `main` is the release. Distributed artifacts (WordPress plugins, add-ons) use `vX.Y.Z` tags with a CI check that the tag matches the version in the code. | Decided | Only distributed things need versions. |

## Quality

| Standard | Provenance | Why |
|---|---|---|
| CI runs on every PR: typecheck, lint, tests. A red check produces no image and no merge. | Decided | CI that ran only after merge let a broken build reach `main`. |
| Runtime validation (zod) at every trust boundary: server actions, route handlers, MCP tools, inbound email and webhooks, public forms. | Decided | Earlier "no validation" decisions assumed a single trusted user, which stopped being true once apps took OAuth clients and email. |
| Tests run against a real Postgres (Testcontainers), not mocks. | Decided | Most bugs worth catching live in queries, constraints and transactions. |
| In CI, database tests fail when they have no database; they never skip. `node-check` can start Postgres (`postgres-image`) for suites that read a database URL. | Decided | A suite that skipped without a database went green with about 800 of its 1,000 tests unrun. Decided 2026-11-01. |
| Mutation-test the rules that matter (recommended): break an invariant on purpose and check a test fails. | Decided | In one app it found invariants no test actually guarded. A practice, not a CI gate. Decided 2026-11-01. |
| Browser (Playwright) e2e is opt-in per project and never sits in the deploy path. | Decided | It added minutes to every deploy for little extra catch. |
| Laravel apps test against a service database matching production's engine and major (reusable `php-check.yml`); SQLite `:memory:` may stay for local runs, with CI as the gate. | Default | MySQL and MariaDB differ in JSON, collations and DDL, so SQLite passes hide real failures. Added 2026-11-01 for the first Laravel migration, whose dev host has no PHP. |

## Security

| Standard | Provenance | Why |
|---|---|---|
| A release-age gate (pnpm `minimumReleaseAge`) never blocks a security fix: a scoped `minimumReleaseAgeExclude` for the patched package, recorded with the advisory and removed once the version passes the gate. | Decided | The audit gate demanded a same-day patch that the age gate held back. Decided 2026-11-01. |
| Dependabot (weekly, minor/patch grouped) for the package manager, Docker and GitHub Actions. | Decided | No repo had automated dependency updates. |
| Dependabot ignores Node and Postgres image majors, `@types/node` and TypeScript majors, and framework majors (Next.js, React, Laravel, Livewire, Tailwind, Vite and plugins). | Decided | The runtime and database majors are stack decisions, and a Postgres major needs a dump and restore. Raised in the first migration pilot (a Node 25 PR). Framework majors added 2026-11-01: each needs a plan for its runtime changes, and its PR sat red or invited a merge without one. A repo also ignores majors of a stack item it keeps until its Phase 6 replacement (Prisma, an auth library), added 2026-11-02 from a migration sweep: that major is replaced, not upgraded, so its PR is noise. Per repo, not in the templates, which start on the standard stack. TypeScript majors added 2026-11-02: a TypeScript 7 PR (the native compiler) went red across an app; other tooling majors (ESLint) stay, merged when green. |
| CI runs a dependency audit on every PR; high and above fails. | Decided | No repo scanned for vulnerable dependencies. |
| Secret scanning is the GitGuardian GitHub app, on every repo. No second scanner in CI. | Decided | It was already installed and checking every PR. |
| Required secrets use `${VAR:?message}` in compose, so a missing secret fails the deploy instead of running with a default. | Established | A localhost default once shipped to production. |
| Containers run as a non-root user. | Decided | Mixed across projects today. |
| Routes called by `fetch` (API routes, webhooks) refuse with 401/403 JSON, never a redirect to sign-in. | Decided | `fetch` follows the redirect to a 200 page and the client reports success. Raised in the first migration pilot. |

## Deploy

| Standard | Provenance | Why |
|---|---|---|
| GitHub Actions builds the image and pushes it to GHCR; compose only pulls it. No `build:` block in compose. | Established | Builds on the deploy host used a stale or missing source tree. |
| `pull_policy: always` on every service with a mutable tag. | Established | `docker compose up` does not re-pull a tag it already has, so redeploys kept running old code. |
| Images are tagged `:main` and `:sha-<sha>` and labelled with `org.opencontainers.image.revision`; `/api/health` reports the running revision. | Established | To check what is actually running, not what the tag claims. |
| Dockhand git-stack webhook in a `deploy` job: a GET with `?secret=`, and the job fails unless Dockhand's JSON body says `success: true`. | Established, hardened | Dockhand answers 200 even when the stack fails to start. |
| Dockhand git stacks have Force redeploy and Re-pull images on; the deploy job checks `/api/health` reports the deployed commit (`APP_HEALTH_URL`), and fails on a skipped redeploy. | Decided | Dockhand redeploys a webhook only when the git commit changed and doesn't re-pull a tag, so two quick merges left the second image unpulled with `success: true` (first migration pilot). |
| Laravel apps on RunCloud: CI builds assets and merges `main` into `deploy-production` on every release (merged, never force-pushed); RunCloud never builds. A manual production gate is a recorded repo exception. | Decided | Merging to `main` is the release for every app. The manual gate stood in for a required reviewer GitHub Free can't enforce, and a single-environment app would pile up unreleased changes behind it. Decided 2026-11-01 (first Laravel migration). |
| Apps that aren't containers report their revision too: CI writes the commit into what it deploys, a no-auth route returns it, and the deploy job waits for it. | Decided | The same reason as `/api/health`: the host's own status doesn't say which commit is live. Decided 2026-11-01. |
| Two deploy modes: Dockhand git stack (webhook), or a service embedded in another stack (no webhook; release-driven tag with auto-update). | Established | The webhook does not apply to a service that lives in someone else's stack. |
| Container healthchecks on `/api/health` (no auth, no database call); the app waits for the database with `service_healthy`. | Established | Rolled out to every app on the same day. |
| Node 24, PostgreSQL 18 (data volume mounted at `/var/lib/postgresql`). | Established | PG18 stores data in a versioned subdirectory. |
| An existing Postgres stack may keep `PGDATA=/var/lib/postgresql/data` with the volume at `.../data`, recorded as a repo exception; move it only at a major-version upgrade. | Decided | Moving the mount means a dump and restore with no benefit; a major upgrade needs one anyway. Raised in the first migration pilot. |
| Backups are a `pg_dump` service or a consistent off-host VM snapshot (snapshot mode with filesystem freeze, or the database stopped). Either is standard; no exception needed. | Decided | A hypervisor-level snapshot already covered one sweep's host; a plain file copy of a live volume may not restore, so it counts as neither. Decided 2026-11-02. |
| A reverse proxy on another machine is allowed: the port is published on the LAN interface and the LAN may reach it; the app trusts only the proxy's address; no app port is reachable from the internet (only 80/443, through the proxy). | Decided | The proxy runs on the firewall for some hosts. Narrowing `trustProxy` stops spoofed client addresses. LAN access to the port is acceptable; the risk that matters is a public app port. Decided 2026-11-02, revised the same day (dropped the host-firewall rule admitting only the proxy). |
| The Postgres password travels in `PGPASSWORD`, beside a `DATABASE_URL` that has no password. | Established | A `/` in the password broke URL parsing and caused a restart loop. |

## Stack (Next.js app profile)

| Standard | Provenance | Why |
|---|---|---|
| Next.js (current major, App Router), TypeScript strict with `noUncheckedIndexedAccess`, pnpm. | Decided | The newer half of my projects already use this. |
| Drizzle ORM with drizzle-kit migrations: append-only, any backfill in the same migration, applied at container start, checked in CI against the schema. | Decided | `prisma db push` at boot could not add unique constraints safely and forced workarounds. |
| zod 4. | Decided | See Quality. |
| Prettier with default settings; `pnpm lint` runs `prettier --check`. | Decided | Only two projects formatted, with different settings. Defaults leave nothing to argue about. |
| Laravel apps: npm for the front end; pnpm only when an advisory needs a per-advisory ignore. | Decided | pnpm's reasons apply to Node apps; a Laravel front end is a Vite build. Decided 2026-11-01. |
| Node services that aren't Next.js (a Fastify API, optionally serving a Vite SPA) follow the Node service profile: the Next.js profile's stack and rules, with its Next-specific mechanisms replaced. | Decided | Some apps can't use Next.js (WebDAV methods) or have no UI. Built from the closest-to-standard such app. Decided 2026-11-01. |
| Node 24 is upgraded in every migration sweep, as its own PR beside Phase 2; other stack items stay in Phase 6. | Decided | Small, low-risk, and pending in several repos. Postgres majors need a dump and restore, so they stay planned. Decided 2026-11-01. |
| Python services: uv with a committed `uv.lock`. | Decided | One fast tool for environments, installs and locking. |
| Own session handling (argon2) plus `openid-client` for OIDC. OIDC rules: `OIDC_ONLY`, `OIDC_TRUST_EMAIL`; a sign-in never re-links an account (creation: next row). | Decided (library), Established (OIDC rules) | Small code that is fully understood; no beta auth dependency. |
| An OIDC sign-in may create an account only with no access, when the provider limits who reaches the client, never the first account, with a verified (or trusted) email that no account, deleted or not, holds; audited, and listed for an admin to place. It never re-links. (`security.md`) | Decided | Replaces "never creates an account" (2026-11-01): family members sign in before an admin grants access, without widening who can get in. |

## MCP

| Standard | Provenance | Why |
|---|---|---|
| MCP at `/mcp` on the app's origin, using the official `@modelcontextprotocol/sdk` (stateless Streamable HTTP). | Decided (SDK), Established (path) | There were four or more hand-rolled or differently-styled servers. |
| One shared package for the OAuth 2.1 authorization server and tool helpers, published to public npm. | Decided | Three separate OAuth servers had been written. Public npm installs in CI and Docker builds with no token (GitHub Packages needs one even for public packages). Not built yet. |
| `snake_case` `verb_noun` tool names; `list_`/`get_` pairs; a `title` and annotations on every tool; refusals are `isError` results with a readable message. | Decided (from the most common existing practice) | One tool vocabulary across apps. |
| Renaming an existing server's tools is a hard cut: one PR with a `!` title and an old → new table, and John is told before it merges. No alias period. | Decided | Clients read the tool list each session, so the model picks up new names at once; what breaks (instructions naming old tools, per-tool permissions) John fixes once. Aliases would double the tool list for the overlap. Decided 2026-11-02, from a migration sweep (59 tools). |

## Design

| Standard | Provenance | Why |
|---|---|---|
| Shared behavioural rules (see `design.md`). | Established, collected in the interview | These were already my most consistent explicit preferences. |
| UI copy follows the `ui-verbosity-reduction` skill: written to it from the start, applied by `ship` to strings a PR changes, and run over a whole app occasionally. | Decided | Agent-built UIs over-explain. Preventing that costs nothing; cleaning it up later costs a full pass. |
| Casing: Title Case for labels, buttons, headings, tabs and badges; sentence case for descriptions, hints, empty states, confirms and errors. A project overrides this only by recording it. | Decided | Mixed casing across apps was agent output, not a decision. |
| Every app uses the same token *names*; each app chooses its own palette and fonts. AA contrast is checked in CI. | Decided | Components and agents work the same way in every app, without every app looking the same. |
| An app built on shadcn/ui renames its tokens to the standard names in Phase 5, `components/ui` included; no alias layer. A component added later with `shadcn add` is edited to the standard names in the same PR. | Decided | One vocabulary in every file, so an agent never has to know which set a file uses. Two sets also clash: `card` and `accent` mean different things in each. Decided 2026-11-02, from a migration sweep. |
| A small shared component kit (Button, Card, Section, PageHeader, IconButton, StatusBadge, EmptyState, ActionForm) in the Next.js template, styled only through the shared tokens. `ActionForm` runs a server action, shows the returned error in place, calls `onDone` only on success, keeps typed values on refusal and lets `redirect()` through. | Decided | Token names alone left every app rebuilding the same components with different behaviour. ActionForm added 2026-11-01: a migration rebuilt that logic per form and got it wrong in several (a redirecting save reported as a failure). Not built yet. |
| A Tailwind 3 app adopts the tokens and dark mode (migration Phase 5) only after its Tailwind 4 upgrade. | Decided | The token file and contrast check assume Tailwind 4's `@theme`; converting every view twice is waste. Decided 2026-11-01. |
| The no-flash theme script may be inline, a render-blocking external script, or inline allowed by a CSP hash. | Decided | A strict CSP forbids inline scripts; the rule is no flash, not the mechanism. Decided 2026-11-01. |
| Page subtitles: optional, one line, only when the page needs context the title can't give. | Decided | Two projects disagreed; a ban lost useful context, unlimited ones narrated the UI. |
| An empty card collapses to its muted header and its add action; a full empty state only when a page's only list is empty. | Decided | "None added" cards filled pages with nothing. |
| No count badges in card headers by default; only where the count isn't visible in the card (collapsed or paginated). | Decided | A badge repeating what's on screen is noise. |
| Creating a record: inline form or modal, the app's choice; either way it stays on the page. | Decided | Both work; what matters is not navigating away and back. |
| Templates get an optional manual (`workflow_dispatch`) job that uploads screenshots of the main screens in both themes, for design review. Not built yet. | Decided | CI uploads Playwright output only on failure, so a design review needed Playwright run locally. Decided 2026-11-02, low priority. |
| Dark mode is required: system preference by default, with a light/dark/system toggle and no flash on load. | Decided | Support had been anywhere from missing to mandatory. |

## Agent docs

| Standard | Provenance | Why |
|---|---|---|
| CLAUDE.md stays compact (about 150 lines or fewer): commands, rules that are easy to break, a layout map, links. Detail goes in `docs/`. | Decided | Files of 500 to 1,200 lines had become logs of per-PR lessons, several of them stale. |
| Agents update facts they change in the same PR. New *rules* go to `docs/claude-candidates.md`; I promote or reject them. | Decided | Agent-written rules had been read as decisions and copied to other repos. |
| Topic docs may sit beside SPEC.md and ARCHITECTURE.md when one of them links to them; an existing spec keeps its name if CLAUDE.md's layout map points to it. | Decided | Renaming breaks links for no gain, and one file per topic reads better than one long spec. Decided 2026-11-02. |
| Rules shared by every project live here, not copied into each CLAUDE.md. | Decided | Copies drift. |
| `AGENTS.md` is a one-line pointer to CLAUDE.md. A tool that writes agent instructions into a tracked file is turned off in its config (Next.js: `agentRules: false`), keeping any useful line in CLAUDE.md. | Established; mechanism fixed 2026-11-02 | The old rule said to gitignore regenerated blocks, which can't work for a tracked file: from Next 16.3 every `next dev` rewrote the pointer. Found in a migration sweep; the option was checked in Next 16.4's source, and `false` also removes an existing block. |
| A long `docs/DECISIONS.md` opens with an index of decisions in force; replaced ones are marked superseded, not edited. | Decided | One log reached 4,640 lines that agents were told to read in full. Decided 2026-11-01. |
| When an existing repo is migrated, its CLAUDE.md rules are sorted with me: contradicts a standard (drop), project fact (move to `docs/`), real candidate (parking lot for a yes or no). | Decided | |
