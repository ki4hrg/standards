# Decisions

Every standard in this repo, the decision behind it, and its provenance. Provenance matters
because a survey of my projects (October 2026) found that many conventions repeated across repos
were never decided by me: an agent wrote them once and they spread by copying. A convention is a
standard only if it is listed here.

Provenance key:
- **Decided**: chosen by me in the standards interview (2026-10-31).
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
| Before opening a PR the agent runs `/code-review` on its diff and fixes what it finds; `/security-review` too when the diff touches a sensitive path. | Decided | Nothing is reviewed by a person before merging, so review happens in the session. |
| Plans, specs and handoffs live in the repo's `docs/`, never only in `~/.claude/plans/`. | Default | Several CLAUDE.md files pointed at plan files that no longer exist. |
| App repos are unversioned: merging to `main` is the release. Distributed artifacts (WordPress plugins, add-ons) use `vX.Y.Z` tags with a CI check that the tag matches the version in the code. | Default | Only distributed things need versions. |

## Quality

| Standard | Provenance | Why |
|---|---|---|
| CI runs on every PR: typecheck, lint, tests. A red check produces no image and no merge. | Decided | CI that ran only after merge let a broken build reach `main`. |
| Runtime validation (zod) at every trust boundary: server actions, route handlers, MCP tools, inbound email and webhooks, public forms. | Decided | Earlier "no validation" decisions assumed a single trusted user, which stopped being true once apps took OAuth clients and email. |
| Tests run against a real Postgres (Testcontainers), not mocks. | Decided | Most bugs worth catching live in queries, constraints and transactions. |
| Browser (Playwright) e2e is opt-in per project and never sits in the deploy path. | Decided | It added minutes to every deploy for little extra catch. |

## Security

| Standard | Provenance | Why |
|---|---|---|
| Dependabot (weekly, minor/patch grouped) for the package manager, Docker and GitHub Actions. | Decided | No repo had automated dependency updates. |
| CI runs a dependency audit on every PR; high and above fails. | Decided | No repo scanned for vulnerable dependencies. |
| Secret scanning is the GitGuardian GitHub app, on every repo. No second scanner in CI. | Decided | It was already installed and checking every PR. |
| Required secrets use `${VAR:?message}` in compose, so a missing secret fails the deploy instead of running with a default. | Established | A localhost default once shipped to production. |
| Containers run as a non-root user. | Default | Mixed across projects today. |

## Deploy

| Standard | Provenance | Why |
|---|---|---|
| GitHub Actions builds the image and pushes it to GHCR; compose only pulls it. No `build:` block in compose. | Established | Builds on the deploy host used a stale or missing source tree. |
| `pull_policy: always` on every service with a mutable tag. | Established | `docker compose up` does not re-pull a tag it already has, so redeploys kept running old code. |
| Images are tagged `:main` and `:sha-<sha>` and labelled with `org.opencontainers.image.revision`; `/api/health` reports the running revision. | Established | To check what is actually running, not what the tag claims. |
| Dockhand git-stack webhook in a `deploy` job: a GET with `?secret=`, and the job fails unless Dockhand's JSON body says `success: true`. | Established, hardened | Dockhand answers 200 even when the stack fails to start. |
| Two deploy modes: Dockhand git stack (webhook), or a service embedded in another stack (no webhook; release-driven tag with auto-update). | Established | The webhook does not apply to a service that lives in someone else's stack. |
| Container healthchecks on `/api/health` (no auth, no database call); the app waits for the database with `service_healthy`. | Established | Rolled out to every app on the same day. |
| Node 24, PostgreSQL 18 (data volume mounted at `/var/lib/postgresql`). | Established | PG18 stores data in a versioned subdirectory. |
| The Postgres password travels in `PGPASSWORD`, beside a `DATABASE_URL` that has no password. | Established | A `/` in the password broke URL parsing and caused a restart loop. |

## Stack (Next.js app profile)

| Standard | Provenance | Why |
|---|---|---|
| Next.js (current major, App Router), TypeScript strict with `noUncheckedIndexedAccess`, pnpm. | Decided | The newer half of my projects already use this. |
| Drizzle ORM with drizzle-kit migrations: append-only, any backfill in the same migration, applied at container start, checked in CI against the schema. | Decided | `prisma db push` at boot could not add unique constraints safely and forced workarounds. |
| zod 4. | Decided | See Quality. |
| Own session handling (argon2) plus `openid-client` for OIDC. OIDC rules: `OIDC_ONLY`, `OIDC_TRUST_EMAIL`; a sign-in never creates an account or re-links one. | Decided (library), Established (OIDC rules) | Small code that is fully understood; no beta auth dependency. |

## MCP

| Standard | Provenance | Why |
|---|---|---|
| MCP at `/mcp` on the app's origin, using the official `@modelcontextprotocol/sdk` (stateless Streamable HTTP). | Decided (SDK), Established (path) | There were four or more hand-rolled or differently-styled servers. |
| One shared package for the OAuth 2.1 authorization server and tool helpers. | Decided | Three separate OAuth servers had been written. Not built yet. |
| `snake_case` `verb_noun` tool names; `list_`/`get_` pairs; a `title` and annotations on every tool; refusals are `isError` results with a readable message. | Default, from the most common existing practice | One tool vocabulary across apps. |

## Design

| Standard | Provenance | Why |
|---|---|---|
| Shared behavioural rules (see `design.md`). | Established, collected in the interview | These were already my most consistent explicit preferences. |
| UI copy follows the `ui-verbosity-reduction` skill: written to it from the start, applied by `ship` to strings a PR changes, and run over a whole app occasionally. | Default (proposed) | Agent-built UIs over-explain. Preventing that costs nothing; cleaning it up later costs a full pass. |
| Casing: Title Case for labels, buttons, headings, tabs and badges; sentence case for descriptions, hints, empty states, confirms and errors. A project overrides this only by recording it. | Default (from the skill) | Mixed casing across apps was agent output, not a decision. |
| Every app uses the same token *names*; each app chooses its own palette and fonts. AA contrast is checked in CI. | Decided | Components and agents work the same way in every app, without every app looking the same. |
| Dark mode is required: system preference by default, with a light/dark/system toggle and no flash on load. | Decided | Support had been anywhere from missing to mandatory. |

## Agent docs

| Standard | Provenance | Why |
|---|---|---|
| CLAUDE.md stays compact (about 150 lines or fewer): commands, rules that are easy to break, a layout map, links. Detail goes in `docs/`. | Decided | Files of 500 to 1,200 lines had become logs of per-PR lessons, several of them stale. |
| Agents update facts they change in the same PR. New *rules* go to `docs/claude-candidates.md`; I promote or reject them. | Decided | Agent-written rules had been read as decisions and copied to other repos. |
| Rules shared by every project live here, not copied into each CLAUDE.md. | Decided | Copies drift. |
| When an existing repo is migrated, its CLAUDE.md rules are sorted with me: contradicts a standard (drop), project fact (move to `docs/`), real candidate (parking lot for a yes or no). | Decided | |
