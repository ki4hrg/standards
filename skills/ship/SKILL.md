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
Judge each check by its own exit code. Piping it (`pnpm test | grep …`, `| tail`) reports the
last command's status, so failing tests look green; run it unpiped, or with `set -o pipefail`.

If a check **can't run** here (out of memory, no Docker for Testcontainers, missing toolchain),
that is not the same as passing: say which check didn't run and why in the PR's Verification
section, open the PR **without** the `automerge` label, and let CI be the check. Add the label
only once that run is green.

Database checks (migrations, Testcontainers tests, a smoke run against Postgres) need Docker. If
this machine has none, they're checks that can't run here: CI runs them.

**If the repo has no PR CI yet** (its workflow runs only on push to `main`, as before migration
Phase 1), nothing checks the PR but you. Say so in the PR, run everything that can run locally,
don't add the label (there's no `merge-on-green` to read it), and leave the merge to John. What
couldn't run locally gets checked on the deploy John watches, and the first CI run is the one
after the merge: follow it and report.

## 3. Review your own diff

Run both reviews from the repo's root: they diff against the default branch, and fail when the
working directory is another repo or `origin/HEAD` isn't set. If it isn't, run
`git remote set-head origin -a` first. A subagent can't change its working directory: if this
session didn't start in the target repo, say so and hand the work to a session started there
(`workflow.md`, Sessions and subagents). If there is none to hand it to (an orchestrated
agent working in another repo's clone), review the diff by hand instead: `git diff
origin/main...HEAD` in that clone, against `docs/core/security.md` for `security-review` and the
same correctness focus for `code-review`. Say in the PR which review was done by hand and why;
don't tick it as run.
A review or research subagent is read-only: tell it to read other revisions with `git show
<ref>:<path>` and `git diff`, never to check out or switch, since it shares your working tree. One
that needs its own tree gets `isolation: "worktree"`. After any subagent, confirm
`git branch --show-current` before you commit.

1. Invoke the `code-review` skill on the branch's diff against `main`. Fix real findings. For a
   finding you don't fix, note in the PR why.
2. If the diff touches a sensitive path, also invoke `security-review`. Sensitive paths:
   - authentication, sessions or OIDC;
   - the OAuth server or MCP endpoint;
   - permission or tenancy checks;
   - public routes or forms;
   - inbound email or webhooks;
   - secrets, tokens or encryption;
   - file uploads;
   - health, children's or other sensitive personal data (models, queries, exports);
   - anything the repo's CLAUDE.md lists as sensitive.
   Fix what it finds.
3. If the diff adds or changes a screen or user-facing text, apply the `ui-verbosity-reduction`
   skill to **every screen the PR touches**, not only the changed strings (wordiness builds up
   across a screen), and check the screen against `docs/design.md`'s "usual answer takes one
   tap". Leave other screens alone: casing or term inconsistencies found there become a
   follow-up issue (step 5).
4. Re-run step 2 if anything changed.

## 4. Docs

- If the change moved, renamed or removed anything that CLAUDE.md or `docs/` names, update it in
  this PR.
- A new rule you think the project should have goes in `docs/claude-candidates.md` (date, rule,
  why, this PR), not in CLAUDE.md.
- Env var added? Update `.env.example` and `docs/DEPLOYMENT.md`.

## 5. Open the PR

- Title: a Conventional Commit, `type(scope): outcome-first summary`, with type one of `feat fix
  docs refactor perf test build ci chore revert`. Scope is lowercase; several are comma-separated
  with no space (`fix(api,forms):`). Add `!` for a breaking change to data or an external
  interface. The title becomes the commit on `main`. If the title check fails, edit the title and
  `gh run rerun <run-id> --failed`; no new push needed.
- Body: the repo's PR template. **Verification** lists what you actually ran and saw. If the work
  came from an issue, the body says `Closes #n`.
- Anything you found and didn't fix (a review finding, an inconsistency, a gap outside this
  change) becomes an issue, with what you saw, where, and why it matters. Write the body to a
  file first, in its own step, then run
  `gh issue create --label agent-found --repo <owner/repo> --title … --body-file <file>` as a
  Bash call of its own: label first and nothing chained (no `&&`, `;` or heredoc), which is the
  only form John's permissions allow (`workflow.md`). Link the issues from the PR.
- Add the `automerge` label with exactly `gh pr edit <n> --add-label automerge`, alone in its
  Bash call (the form John's permissions allow; `workflow.md`, Dev machine), **unless**:
  - John asked to see it first;
  - a migration drops or rewrites data;
  - a security-review finding is left open;
  - you are unsure the change is right.

  In those cases, leave it unlabelled and tell John why in one line.

If the PR is a draft, mark it ready (`gh pr ready <n>`) once steps 2 to 4 are done, labelled or
not. A draft says the work isn't finished; one left as a draft never merges and John doesn't
know to look at it.

If `gh` isn't available (some cloud sessions), use the environment's own PR tool. If the label
can't be set, tell John.

## 6. See it through

**Don't merge the PR yourself**, even when the checks are green. `merge-on-green` merges the
tested commit and starts the deploy. A session merging right after opening the PR, before CI
had run, is how broken builds used to reach `main`.

Watch CI (`gh pr checks <n> --watch`). If a job fails, fix it on the same branch and push; the
new commit gets its own run.

A PR that changes `.github/workflows/` isn't merged by `merge-on-green`: the workflow token can't
merge workflow files, so the merge job warns and leaves it open (`docs/core/workflow.md`). Tell
John it's green and waiting for him to merge it.

If every job fails within seconds and the annotation says "The job was not started because
recent account payments have failed" or mentions a spending limit, that is **GitHub billing**,
not the code. Don't push fixes, re-run, or add the label: tell John, and stop until he says it's
cleared.

When `merge-on-green` has merged, say so, and check the issue from `Closes #n` closed (the
`close-issues` job does it; a repo without that job yet needs it closed by hand, with a comment
naming the PR). Then follow the
dispatched `main` run (`gh run list --branch main --limit 1`, `gh run watch`) and report the
deploy result. The work isn't done until the PR has merged or John knows why it hasn't. If
the session must end first, say where things stand, and comment the same on the issue the work
came from; the label will still merge the PR when CI passes.

After the merge, any further work in this session goes on a new branch (step 1).

When the task is finished, clean up what it left on the machine: the containers and images it
created, then `docker builder prune -af` (`docs/core/workflow.md`, Dev machine). The dev VMs'
disks are small, and a full one crashes the machine.
