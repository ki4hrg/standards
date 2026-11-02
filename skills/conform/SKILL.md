---
name: conform
description: Audit an existing repo against John's engineering standards and report the gaps — CI, deploy, security, stack, design, agent docs — including a triage of its CLAUDE.md rules into drop / move to docs / candidate. Report only; changes nothing unless John asks. Use when John asks how a repo measures up to the standards, what it would take to bring it up to standard, or to audit/triage a CLAUDE.md.
---

# Conform (audit)

The standards are in this plugin's root, two directories up from this file. Read
`docs/decisions.md`, the repo's profile in `docs/profiles/`, and `docs/core/`. Bringing existing
repos to standard is its own project, so this skill **reports and changes nothing** unless John
asks for specific fixes.

## 1. Identify

- Profile: Next.js app, Node service (non-Next Node server, e.g. Fastify, optionally with an SPA), Python service, WordPress plugin, Laravel app, or none (infra/ops repo).
- Activity: commits in the last 90 days, the share authored or co-authored by Claude.

## 2. Check

For each standard that applies to the profile, record status (meets / partial / missing /
conflicts) and evidence (a file and line, or a command and its output). Cover at least:

- **Workflow:**
  - CI runs on `pull_request`;
  - merge method and settings (`gh api repos/<o>/<r>`);
  - `automerge` label and merge-on-green;
  - PR template;
  - PR title convention in recent history.
- **Quality:**
  - typecheck, lint and test in CI, and whether they gate the image;
  - tests run against a real database;
  - validation at trust boundaries: find server actions, route handlers, MCP tools and webhooks
    that read input without parsing it;
  - what a 500 returns: a Fastify app without `setErrorHandler` echoes raw error messages
    (database driver text included), and a Next.js action that throws shows "Minified React
    error". Report either as a Phase 3 gap.
- **Security:**
  - Dependabot;
  - dependency audit in CI; GitGuardian app covers the repo;
  - `${VAR:?}` guards for required secrets;
  - non-root container;
  - env validated at boot;
  - least-privilege workflow permissions.
- **Deploy:**
  - image built in CI;
  - no `build:` in compose;
  - `pull_policy: always`;
  - tags and revision label;
  - webhook with the success check;
  - healthcheck and `/api/health` (no auth, no database, reports the revision). Look for an
    existing health route under another name (`/healthz`, `/health`, `/status`) and what the
    compose/Dockerfile healthchecks call; report it as a Phase 2 item, not as compliant;
  - Postgres 18 mount;
  - `PGPASSWORD`;
  - migrations, not `db push`.
- **Stack:** differences from the profile (package manager, ORM, auth library, Node version, MCP
  implementation). These are migration work, not defects.
- **Design:**
  - tokens or raw palette classes;
  - dark mode and its toggle;
  - contrast check;
  - the behavioural rules in `docs/design.md`, as far as the code shows them.
  - UI copy: sample a few screens against the `ui-verbosity-reduction` rules and casing. Report
    how much would change; don't rewrite it here.
- **Agent docs:**
  - CLAUDE.md length;
  - stale facts (check named paths and commands against the code);
  - `docs/` layout;
  - plans referenced outside the repo.

## 3. Triage CLAUDE.md

Sort every rule in CLAUDE.md (and AGENTS.md, and any rules in `docs/`) into:

- **Drop:** contradicts a standard, or repeats one (the standards repo already says it). A rule
  that a standard replaces but the repo hasn't adopted yet (a later phase) is not dropped: it
  moves to docs as a fact until that phase lands, so its details survive.
- **Move to docs:** a true project fact or a domain spec. Say where it goes.
- **Candidate:** a real rule that isn't a standard. For each, give the evidence for whether John
  chose it or an agent did:
  - `git log -S'<phrase>' -- CLAUDE.md`: who added it, with or without a Claude trailer;
  - whether it was added after an incident or a correction;
  - whether the same text appears verbatim in other repos (copying spreads agent assumptions).

Candidates are the only bucket that needs John's decision. Present them as a short list he can
answer yes or no.

## 4. Report

Give a summary table (area, status, top gaps), then the details, the triage, and an ordered fix
list with rough effort. Lead the fix list with gaps that can ship a broken or unsafe build:
- CI not running on PRs;
- the image not waiting for tests;
- missing secret guards;
- a root container.

Offer to save the report as `docs/plans/standards-conformance.md` in the repo; don't write it
without a yes.
