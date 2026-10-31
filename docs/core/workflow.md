# Workflow

How a change gets from a prompt to production. Applies to every profile.

## Branches and PRs

- Work happens on a branch (`claude/<slug>` from a Claude session is fine) and lands through a PR.
- Direct pushes to `main` are allowed only in:
  - infra/ops repos (runbooks, compose stacks, scripts);
  - single-file utilities;
  - a new project before its first deploy;
  - changes that touch only `docs/`, `CLAUDE.md` or `README.md`.
  A repo that relies on one of these exceptions says so in its CLAUDE.md.
- Keep a PR to one change. Several unrelated changes go in several PRs.
- **A branch is used for one PR, then abandoned.** After its PR merges, start the next change on a
  new branch from a freshly fetched `origin/main` (`git fetch && git switch -c <new> origin/main`).
  Never push more work to a merged branch and open a second PR from it: the squash commit on
  `main` doesn't share history with the branch's commits, so the new PR repeats the old changes
  and conflicts with them. If follow-up commits already landed on a merged branch, cherry-pick
  just those onto a new branch from `origin/main`.
- Don't stack PRs (a branch cut from another unmerged branch) unless it's needed. If one is
  stacked, rebase it after its parent merges: `git rebase --onto origin/main <parent> <child>`.
- Use the PR template (`.github/pull_request_template.md`). The "Verification" section says what
  was actually run, not what should work.

## PR titles and history

- Squash merge only. Merge commits and rebase merging are turned off in the repo settings
  (`scripts/repo-settings.sh`).
- The PR title is a Conventional Commit and becomes the commit on `main`:
  `type(scope): outcome-first summary`, where type is one of
  `feat fix docs refactor perf test build ci chore revert`. Scope is optional, lowercase; several
  scopes are comma-separated with no space (`fix(api,forms): …`). Add `!` for a
  breaking change to data or an external interface (MCP tools, webhooks, env vars).
- Commits on the branch can be anything; nobody reads them after the squash.
- `merge-on-green` checks the title. If it fails, fix the title (`gh pr edit <n> --title …`) and
  re-run the failed jobs (`gh run rerun <run-id> --failed`); the check reads the current title, so
  no new push is needed.

## Merging

PRs merge themselves when CI is green.

1. Before opening the PR, the agent runs the checks locally and the reviews below, and fixes what
   they find.
2. The agent opens the PR and adds the `automerge` label, unless the person asked to look first.
3. CI runs. When every job passes, `merge-on-green` squash-merges the exact commit that was
   tested and starts the `main` pipeline, which builds the image and deploys. `close-linked-issues`
   then closes the issues the PR names with `Closes #n` (GitHub skips that for a merge made by
   the workflow token).
4. The agent watches CI and reports the merge and the deploy. It does **not** merge the PR itself:
   merging seconds after opening, before CI ran, is how broken builds used to reach `main`.
5. If CI fails, the agent fixes it on the same branch. A PR is not finished until it is merged or
   the person has been told why it is not.

Remove the label to hold a change for a person to review: schema changes that drop data, changes
to auth, anything the session was unsure of.

**A draft means work is still going on.** Open a PR as a draft only while it isn't finished. Once
it is (checks pass, reviews done, description final), mark it ready with `gh pr ready <n>`, even
when it's held for John without the label: a draft tells him there's nothing to look at yet.
`merge-on-green` skips drafts.

## Review

There is no human review before merging, so review happens in the session:

- **Always:** `/code-review` on the branch diff before opening the PR. Fix the findings, or say in
  the PR why a finding does not apply.
- **When the diff touches a sensitive path:** `/security-review` as well. Sensitive means:
  authentication, sessions or OIDC; the OAuth server or MCP endpoint; permission or tenancy
  checks; public (unauthenticated) routes and forms; inbound email or webhooks; secrets,
  encryption or tokens; file uploads.
- CI adds a dependency audit, and the GitGuardian app scans for secrets (`security.md`).

## Issues, plans and handoffs

- **An issue is the unit of work:** what and why, short enough to read on a phone. A session
  works from an issue, and its PR says `Closes #n`.
- **A plan is the how**, and only exists when the work needs more than one PR or session: a design,
  migration steps, a phased rollout. It goes in `docs/plans/<topic>.md`, linked from the issue,
  never only in `~/.claude/plans/` (local to one machine, and cleaned up). When the work is done
  the plan stays as a record, marked done at the top.
- **Follow-ups become issues**, opened by the agent with the `agent-found` label: review findings
  left unfixed, inconsistencies noticed in passing, conformance gaps. Not a note in a PR that
  nobody reads again. John triages the label.
- **Handoffs:** a session that stops partway through an issue comments on the issue: what was
  done, what was verified and what wasn't, where to resume, and the branch. `docs/HANDOFF.md`
  is only for efforts that span several issues, such as a migration sweep.

## Sessions and subagents

- **Work on a repo from a session started in that repo.** Subagents start in the dispatching
  session's directory and can't change it, and `/security-review` and `/code-review` review the
  repo they run in. A coordinating session (a migration sweep) hands each repo's work to a session
  started in that repo, not to its own subagents.
- **Agents may open `agent-found` issues and add the `automerge` label** without asking. John's
  settings allow exactly `gh issue create --label agent-found …` (label first) and
  `gh pr edit <n> --add-label automerge` (nothing after it). Any other issue, comment, label or
  external write still asks. In auto mode the classifier blocks labelling as a merge without
  review unless `autoMode.allow` also describes it; see Dev machine.

## Dev machine

What a machine needs to run every check locally. Missing pieces aren't blockers: a check that
can't run here runs in CI instead (`ship`).

- **Node 24 on `PATH`, installed somewhere permanent** (a version manager or `~/.local`). Never in
  a session's temp or scratchpad directory, which can be wiped on restart and take running work
  with it.
- **Docker** (user in the `docker` group) for database checks and Testcontainers. Recommended,
  not required.
- **Browsers for smoke tests:** if Playwright can't launch on the host (missing system
  libraries, no sudo), run it in the `mcr.microsoft.com/playwright` image matching the installed
  Playwright version.
- **Claude Code settings** (`~/.claude/settings.json`, one-time): `permissions.allow` gets
  `Bash(gh issue create --label agent-found *)` and `Bash(gh pr edit * --add-label automerge)`;
  `autoMode.allow` gets a sentence for each, saying what it covers and what it doesn't (merging,
  other labels). Without them every PR waits on a prompt to label it.
- **Memory:** `next build` and `tsc` on a large generated client (Prisma) want about 3 GB of heap.
  On a smaller machine, set `NODE_OPTIONS=--max-old-space-size=…` or let CI run them.

## Versions and releases

- Apps are unversioned: merging to `main` is the release.
- Distributed artifacts (WordPress plugins, add-ons, anything someone installs) use `vX.Y.Z` tags.
  CI checks that the tag matches the version in the code, then publishes with
  `gh release create --generate-notes`.

## Local development

Every repo has a `.env.example` that lists every variable the app reads, kept in sync with the
README, plus one command to start the app locally (documented in CLAUDE.md).
