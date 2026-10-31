---
name: ship
description: Land a finished change the standard way — run checks, self-review with /code-review (and /security-review on sensitive paths), update docs, open a PR with a Conventional Commit title, label it automerge, and see CI through. Use whenever work in a repo that follows John's standards is ready to commit, push or open as a PR, or when John says ship it, open a PR, or land it.
---

# Ship

The standards are in this plugin's root, two directories up from this file:
`docs/core/workflow.md` is the full process. In short: nothing is reviewed by a person before it
merges, so this skill is the review.

## 1. Where it goes

- On `main`: if the repo's CLAUDE.md allows direct pushes (infra/ops repo, single-file utility, not
  yet deployed) or the diff touches only docs, commit and push to `main` after step 2, then stop.
  Otherwise create a branch first.
- **Never reuse a branch whose PR has merged.** Check with `gh pr list --head <branch> --state
  merged`. If it has, start a new branch from a freshly fetched `origin/main` and cherry-pick only
  the new commits onto it. A squash merge leaves the branch's old commits off `main`'s history, so
  a second PR from the same branch repeats them and conflicts. This applies to `claude/*` session
  branches too: a session that continues after its PR merged moves to a new branch.
- One change per PR. If the work holds unrelated changes, split them.

## 2. Checks

Run the commands CLAUDE.md says must pass (for a Next.js app: `pnpm typecheck && pnpm lint &&
pnpm test`; also `pnpm db:drift` if the schema changed). Fix failures. Don't open a PR on red.

If a check **can't run** here (out of memory, no Docker for Testcontainers, missing toolchain),
that is not the same as passing: say which check didn't run and why in the PR's Verification
section, open the PR **without** the `automerge` label, and let CI be the check. Add the label
only once that run is green.

## 3. Review your own diff

1. Invoke the `code-review` skill on the branch's diff against `main`. Fix real findings. For a
   finding you don't fix, note in the PR why.
2. If the diff touches a sensitive path, also invoke `security-review`. Sensitive paths:
   - authentication, sessions or OIDC;
   - the OAuth server or MCP endpoint;
   - permission or tenancy checks;
   - public routes or forms;
   - inbound email or webhooks;
   - secrets, tokens or encryption;
   - file uploads.
   Fix what it finds.
3. If the diff adds or changes user-facing text, apply the `ui-verbosity-reduction` skill to
   **those strings only**, not the rest of the app. Note in the PR any wider casing or term
   inconsistencies it finds, as follow-ups.
4. Re-run step 2 if anything changed.

## 4. Docs

- If the change moved, renamed or removed anything that CLAUDE.md or `docs/` names, update it in
  this PR.
- A new rule you think the project should have goes in `docs/claude-candidates.md` (date, rule,
  why, this PR), not in CLAUDE.md.
- Env var added? Update `.env.example` and `docs/DEPLOYMENT.md`.

## 5. Open the PR

- Title: a Conventional Commit, `type(scope): outcome-first summary`, with type one of `feat fix
  docs refactor perf test build ci chore revert`. Add `!` for a breaking change to data or an
  external interface. The title becomes the commit on `main`.
- Body: the repo's PR template. **Verification** lists what you actually ran and saw.
- Add the `automerge` label, **unless**:
  - John asked to see it first;
  - a migration drops or rewrites data;
  - a security-review finding is left open;
  - you are unsure the change is right.

  In those cases, leave it unlabelled and tell John why in one line.

If `gh` isn't available (some cloud sessions), use the environment's own PR tool. If the label
can't be set, tell John.

## 6. See it through

**Don't merge the PR yourself**, even when the checks are green. `merge-on-green` merges the
tested commit and starts the deploy. A session merging right after opening the PR, before CI
had run, is how broken builds used to reach `main`.

Watch CI (`gh pr checks <n> --watch`). If a job fails, fix it on the same branch and push; the
new commit gets its own run.

If every job fails within seconds and the annotation says "The job was not started because
recent account payments have failed" or mentions a spending limit, that is **GitHub billing**,
not the code. Don't push fixes, re-run, or add the label: tell John, and stop until he says it's
cleared. When `merge-on-green` has merged, say so. Then follow the
dispatched `main` run (`gh run list --branch main --limit 1`, `gh run watch`) and report the
deploy result. The work isn't done until the PR has merged or John knows why it hasn't. If
the session must end first, say where things stand; the label will still merge the PR when
CI passes.

After the merge, any further work in this session goes on a new branch (step 1).
