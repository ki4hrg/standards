# Security

## In CI (every PR)

The reusable `security.yml` workflow runs:

- **Dependency audit** for the repo's package manager (`pnpm audit`, `npm audit`,
  `composer audit`, or `pip-audit` through uv), failing on **high** or above. If an advisory has
  no fix yet and does not affect the app, record the exception in `docs/DECISIONS.md` and ignore
  that one advisory in the package manager's own config (pnpm: `auditConfig.ignoreGhsas` in
  `pnpm-workspace.yaml`; composer: `config.audit.ignore`). Don't lower the level for everything.
- **Secrets:** the GitGuardian GitHub app checks every PR. A new repo must be inside its
  repository access. A real leak is fixed by rotating the secret, not by rewriting history.

## Dependabot

Every repo has `.github/dependabot.yml` with weekly updates for its package ecosystem, Docker base
images and GitHub Actions, minor and patch updates grouped into one PR per ecosystem (every ecosystem in the file, as in the
template). Dependabot
PRs go through CI like any other; merge them from the PR list. (`merge-on-green` can't merge them:
workflows triggered by Dependabot get a read-only token.)

## In the session

`/security-review` before opening a PR that touches a sensitive path (listed in `workflow.md`).

## Application rules

- **Validate at every trust boundary** with zod (or the stack's equivalent): server actions,
  route handlers, MCP tool input, inbound email and webhooks, public forms. Parse, don't cast.
- **Authenticate where the request arrives.** A layout or middleware guard does not cover server
  actions or `app/api/` routes; each authenticates itself. Keep a route-guard table in
  `docs/ARCHITECTURE.md`.
- **Authorize per call**, including in MCP tools: check the scope and the user's access to the
  specific record.
- **Never log or return secrets**: not in audit rows, logs, error messages or MCP output.
- **Encrypt stored third-party tokens** with a key that is separate from the session secret, so
  rotating sessions does not destroy them.
- **Client IP** comes from `X-Forwarded-For` counted from the right by the number of trusted proxy
  hops, never the leftmost entry.
- Webhook endpoints verify a signature (HMAC) or a secret, and reject replays where the sender
  supports it.

## Secrets and config

- Secrets are never committed. `.env.example` lists every variable with a placeholder.
- In compose, a required secret is `${VAR:?set VAR}`, never a default. An optional one is
  `${VAR:-}`.
- The app validates its environment at startup (`instrumentation.ts` for Next.js) and refuses to
  boot on a missing or malformed value. A feature that needs several variables (OIDC: issuer, id,
  secret) is off when none are set and fails the boot when only some are.
- GitHub workflow `permissions:` are least-privilege: `contents: read` at the top, elevated per
  job.
