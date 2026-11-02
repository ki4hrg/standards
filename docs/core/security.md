# Security

## In CI (every PR)

The reusable `security.yml` workflow runs:

- **Dependency audit** for the repo's package manager (`pnpm audit`, `npm audit`,
  `composer audit`, or `pip-audit` through uv), failing on **high** or above. Dev dependencies
  are audited too, on purpose: build tools run in CI with a token and on dev machines, and some
  ship in the image anyway (an ORM's CLI for migrations).

  To clear an advisory, in order of preference:
  1. Upgrade the direct dependency.
  2. Force a patched version of the transitive one (pnpm `overrides` in `pnpm-workspace.yaml`,
     npm `overrides` in `package.json`), and check the app still builds and passes.
  3. If no patched version exists and the advisory doesn't affect the app, record the exception in
     `docs/DECISIONS.md` and ignore that one advisory in the package manager's config (pnpm:
     `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`; composer: `config.audit.ignore`).
     **npm has no per-advisory ignore.** An npm repo that needs one moves to pnpm for it (the
     Phase 6 item, brought forward).

  A release-age gate (pnpm's `minimumReleaseAge`, where a repo uses one) never holds back a
  security fix: exclude just the patched package (`minimumReleaseAgeExclude`), record it in
  `docs/DECISIONS.md` with the advisory, and remove the exclusion once that version is older
  than the gate.

  Never lower the audit level for everything.
- **Secrets:** the GitGuardian GitHub app checks every PR. A new repo must be inside its
  repository access. A real leak is fixed by rotating the secret, not by rewriting history.

## Dependabot

Every repo has `.github/dependabot.yml` with weekly updates for its package ecosystem, Docker base
images and GitHub Actions, minor and patch updates grouped into one PR per ecosystem, and `commit-message: { prefix: chore, include: scope }` so titles pass the Conventional Commit check (every ecosystem in the file, as in the
template). Dependabot
PRs go through CI like any other; merge them from the PR list. Majors of the runtime and
database images (Node, Postgres), `@types/node`, and the frameworks (Next.js, React, Laravel,
Livewire, Tailwind, Vite and their plugins) are ignored: those versions are a stack decision
(`decisions.md`), a Postgres major needs a dump and restore, and a framework major needs a plan
for its runtime changes (migration Phase 6). Add a repo's own framework to its ignore list. (`merge-on-green` can't merge them:
workflows triggered by Dependabot get a read-only token.)

## In the session

`/security-review` before opening a PR that touches a sensitive path (listed in `workflow.md`).

## Application rules

- **Validate at every trust boundary** with zod (or the stack's equivalent): server actions,
  route handlers and API routes, MCP tool input, inbound email and webhooks, public forms. Parse, don't cast.
- **Authenticate where the request arrives.** A guard somewhere else doesn't cover an entry
  point: a Next.js layout or middleware guard doesn't cover server actions or `app/api/` routes,
  and a global hook that only resolves who is calling isn't a permission check. Each entry point
  authenticates and authorizes itself. Keep a route-guard table in
  `docs/ARCHITECTURE.md`, one row per route group: | Routes | Authentication | Authorization and
  scope | Input parsing |.
- **Routes called by `fetch` refuse with a status, not a redirect.** An API route, webhook or
  anything a client calls with `fetch` answers 401 or 403 with a JSON body. A redirect to the
  sign-in page is followed by `fetch` to a 200 HTML page, and the client reports success. Only
  page navigations redirect to sign-in.
- **Authorize per call**, including in MCP tools: check the scope and the user's access to the
  specific record.
- **Size limits are per route.** A large request-body limit belongs only on the routes that need
  it (uploads, webhooks that carry mail or files). Never raise a global limit that
  unauthenticated requests also get. (Next.js specifics in its profile.)
  - An upload route authenticates first, then enforces its limit.
  - A signed webhook can't authenticate before reading, because the signature covers the body.
    It requires a `Content-Length` (411 without one), refuses one over its cap (413), then reads
    the body and verifies the signature before parsing it.
- **Sign-in with OIDC** (`openid-client`): `OIDC_ONLY` turns password sign-in off;
  `OIDC_TRUST_EMAIL` accepts the provider's email without its
  `email_verified`. A sign-in **never re-links** an existing account to a new subject. It may
  **create** an account only when all of these hold:
  - the provider limits who can reach this client (for example, groups per client);
  - it is not the first account;
  - the email is verified, or `OIDC_TRUST_EMAIL` is on;
  - no account, including a soft-deleted one, holds that email or subject, so a deleted account
    can't come back by signing in;
  - the new account gets **no access** (no group, tenant or role) until an admin places it, and
    admins have a view of accounts awaiting placement;
  - the creation is audited.
- **Never log or return secrets**: not in audit rows, logs, error messages or MCP output.
- **Encrypt stored third-party tokens** with a key that is separate from the session secret, so
  rotating sessions does not destroy them.
- **Client IP** comes from `X-Forwarded-For` counted from the right by the number of trusted proxy
  hops, never the leftmost entry.
- Webhook endpoints verify a signature (HMAC) or a secret, and reject replays where the sender
  supports it.

## Secrets and config

- Secrets are never committed. `.env.example` lists every variable with a placeholder.
- Test credentials are generated or read from the environment, not written as literals.
  GitGuardian scans every commit in a PR, so a literal in an early commit keeps the PR red after
  a later commit removes it. When that happens, John resolves the incident in GitGuardian (as a
  test credential, or by rotating a real one); then push a new commit, because the check can't be
  re-requested with the repo's token.
- In compose, a required secret is `${VAR:?set VAR}`, never a default. An optional one is
  `${VAR:-}`.
- The app validates its environment at startup (`instrumentation.ts` for Next.js) and refuses to
  boot on a missing or malformed value. A feature that needs several variables (OIDC: issuer, id,
  secret) is off when none are set and fails the boot when only some are.
- GitHub workflow `permissions:` are least-privilege: `contents: read` at the top, elevated per
  job.
