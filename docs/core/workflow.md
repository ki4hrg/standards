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
   tested and starts the `main` pipeline, which builds the image and deploys. When the merged
   tree is exactly the tested one, that run skips check and audit (`pass-tested`). `close-linked-issues`
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

**A PR with a merge conflict gets no CI run at all.** GitHub silently skips `pull_request`
workflows on a PR it can't merge, so nothing fails and `merge-on-green` never fires. PRs worked on
in parallel (migration phases, say) don't touch the same files; when one must follow another,
merge `origin/main` into the later branch after the earlier one lands, before labelling. A PR
that sits with no run: check `gh pr view <n> --json mergeable`.

**Adding the label to a PR that's already green merges it without re-testing.** The label's own
run skips the checks, and `merge-on-green` merges only if they passed on that commit in another
run (`require-jobs`). If they're still running, that run reads the label when it finishes and
merges. Labelling at create time is safe for the same reason.

**A repo's own merge-gating job goes in a local called workflow.** `require-jobs` matches only
check runs named `<caller job> / <job>`, which only a called workflow produces. A plain job
(`e2e:` with its own `steps:`) shows as bare `e2e`, and the label's run, where it is skipped,
reports a bare `e2e` too, so it can't be told apart and is never matched: a label added after
the checks passed then never merges. So put the job's steps in `.github/workflows/e2e.yml`
(`on: workflow_call`) and call it from `ci.yml` (`e2e: uses: ./.github/workflows/e2e.yml`), with
the same `if:` as `check` so the label's run skips it, and add it to automerge's `needs` and
`require-jobs`. A PR-only gate (e2e that blocks the merge but not the build) stays out of
`image`'s `needs` and runs only on `pull_request`.

**A green PR labelled `automerge` that sits unmerged** means no run merged after the label went
on. Remove and re-add the label, which is cheap: its run only checks and merges. The exception
is below.

**A PR that changes `.github/workflows/` is merged by a person.** GitHub refuses a merge by the
workflow token that changes a workflow file, and that token can't be given the permission it
would need. `merge-on-green` checks for one, leaves the PR open with a warning in the run
summary, and the merge job stays green. That covers Dependabot's GitHub Actions bumps and any CI
change made in a migration sweep. The agent says in its report that the PR waits for John to
merge it. His merge pushes to `main` as himself, so the `main` pipeline runs as usual.

## Review

There is no human review before merging, so review happens in the session:

- **Always:** `/code-review` on the branch diff before opening the PR. Fix the findings, or say in
  the PR why a finding does not apply.
- **When the diff touches a sensitive path:** `/security-review` as well. Sensitive means:
  authentication, sessions or OIDC; the OAuth server or MCP endpoint; permission or tenancy
  checks; public (unauthenticated) routes and forms; inbound email or webhooks; secrets,
  encryption or tokens; file uploads; models, queries or exports holding health, children's or
  other sensitive personal data. A repo's CLAUDE.md may name its own paths on top of these.
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
- **Agents that share a checkout never move its HEAD.** A subagent works in the dispatching
  session's working tree, so its `git checkout` or `git switch` moves the branch out from under
  that session, and the session's next commit lands on whatever HEAD was left (once, a detached
  one, on no branch). Brief review and research agents as read-only: read other revisions with
  `git show <ref>:<path>`, `git diff` and `git log`, never check out, switch, stash or reset. An
  agent that needs another tree or makes commits of its own gets one: `isolation: "worktree"`
  on the Agent call, or `git worktree add`. Before committing after a subagent ran, check
  `git branch --show-current` is the branch you expect.
- **Agents may open `agent-found` issues and add the `automerge` label** without asking. John's
  settings allow exactly `gh issue create --label agent-found …` (label first) and
  `gh pr edit <n> --add-label automerge` (nothing after it). Any other issue, comment, label or
  external write still asks. In auto mode the classifier blocks labelling as a merge without
  review unless `autoMode.allow` also describes it; see Dev machine.

  Each of the two runs **as its own Bash call, with nothing chained**. Joined to anything else
  (`&&`, `;`, a heredoc writing the body, a file append, the other command) it no longer matches
  the allowed form and gets blocked; alone it passes. So write the issue body to a file in an
  earlier step (in the session's scratchpad), then run
  `gh issue create --label agent-found --repo <owner/repo> --title "…" --body-file <file>` by
  itself.

## Self-hosted runner

A private repo's check, audit and image jobs can run on John's self-hosted runner, which costs no
Actions minutes. The runner serves John's GitHub organization: app repos move into it as they're
swept (`docs/migration/checklist.md`). Repo variables route jobs there, each holding the
runner's label, and only for a private repo:

- `PR_RUNNER`: PR jobs from a branch in the same repo (check, audit, the build-only PR image).
  Set on every enrolled repo.
- `MAIN_RUNNER`: check and audit on `main`.
- `IMAGE_RUNNER`: the image build and push on `main`.

Unset, a job uses GitHub's runners. `main` stays there by default; `MAIN_RUNNER` and
`IMAGE_RUNNER` are overrides John sets when he needs to stretch Actions minutes, and deletes
again for a normal pace. The variables are per repo because an organization's variables don't
reach private repos on GitHub's free plan, and separate so each can go back on its own.

- **Merging and deploying stay on GitHub's runners.** `merge-on-green`, `close-linked-issues` and
  the deploy hold a token that can merge or the deploy webhook's secret, take about a minute
  each, and the runner has no path to the lab anyway.
- **`IMAGE_RUNNER` puts a write token on the runner.** On `main`, the image job holds
  `packages: write` for the length of the job. PR jobs on the same machine run code nobody has
  read (dependency updates), so a PR job that escaped its slot could tamper with a later `main`
  build and push an image that deploys. Each job's fresh registration, own user and wipe make
  that unlikely, but it's why the push has its own variable and GitHub's runner is the default.
- **Nothing carries over between jobs.** Each job gets a just-in-time runner registration and a
  fresh rootless Docker daemon, with no build cache. PR builds run cold, which costs time, not
  minutes.
- **Isolated from the LAN.** The runner reaches the internet and nothing at home: not the app
  hosts, not the deploy tooling, not the reverse proxy. Its build and network setup lives with
  the lab's infrastructure, not here.
- **Public repos can never reach it, and the runner group enforces that, not the templates.** A
  fork's PR runs the workflow as the fork wrote it, so it can name the runner's label directly.
  The organization's runner group has "Allow public repositories" off; that setting is the
  control. The templates' private-repo condition only stops an honest workflow sending a job there
  by mistake.
- **Its token can only register runners.** An organization-owned token with "Self-hosted runners"
  permission and no repository access, readable only by the service that starts runners. A
  repo-level runner would need a token that can also change a repo's settings or visibility.
- **amd64 only.** A repo that builds an arm64 image sets its image job's `runs-on` to
  `ubuntu-24.04-arm` alone and ignores `IMAGE_RUNNER`.
- **Enrolling a repo** means moving it into the organization and setting `PR_RUNNER`. To send a
  repo back to GitHub's runners, delete its variables.
- **If the runner is down (or its token expired),** jobs wait in the queue and never fall back
  to GitHub's runners; GitHub fails them after 24 hours. On `main` that means a merge doesn't
  deploy until someone notices (the runner's heartbeat alert goes to John). Delete each enrolled
  repo's runner variables and re-run the waiting jobs. A job that finished every
  step but still shows running has lost its completion report: cancel it and re-run.

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
- **Clean up when a task ends.** The dev VMs sit on small thin-provisioned disks, and a full
  thin pool crashes the machine; downloading again later is the cheaper failure. So when a task
  is finished (after `ship`, or when it's abandoned), the agent:
  - removes the containers it started and the images it built or pulled for the task
    (`docker compose down` for a stack it brought up, adding `-v` only for volumes it created;
    `docker rm` and `docker rmi` for the rest). Never another session's or John's;
  - runs `docker builder prune -af`: all build cache, not just dangling. BuildKit keeps cache a
    running build is using, so another session's build isn't broken, only slower next time.

  The package manager's cache (`npm cache clean --force`, `pnpm store prune`) is **not** part of
  this: other sessions' installs read it while they run, and clearing it under them can fail
  them. Clear it by hand when the disk is low and no install is running.

  It also cleans up the task's branches:
  - switches the checkout back to `main` and pulls (`git switch main && git pull --ff-only`), so
    the next session doesn't start on a finished branch;
  - removes worktrees the task added (`git worktree remove <path>`, then `git worktree prune`);
  - `git fetch --prune`, which drops remote-tracking refs for branches GitHub already deleted on
    merge;
  - deletes each local branch whose PR has merged **with the branch's current tip**:
    `gh pr list --state merged --head <branch> --json headRefOid -q '.[].headRefOid'` must list
    `git rev-parse <branch>`, then `git branch -D <branch>`. Matching the name alone isn't
    enough: a reused branch name matches an old merged PR while holding new, unmerged work. `-D`,
    because a squash merge leaves the branch looking unmerged to git, so `git branch -d` refuses
    and `git branch --merged` misses it;
  - deletes the remote branch only when its PR has merged or been closed and GitHub didn't
    delete it (a repo without "delete branch on merge" yet): `git push origin --delete <branch>`.

  Never a branch with an open PR, and never one that isn't the task's own unless its PR has
  merged: another session may be working on it. Git refuses to delete a branch checked out in
  another worktree; leave it.

## Versions and releases

- Apps are unversioned: merging to `main` is the release.
- Distributed artifacts (WordPress plugins, add-ons, anything someone installs) use `vX.Y.Z` tags.
  CI checks that the tag matches the version in the code, then publishes with
  `gh release create --generate-notes`.

## Local development

Every repo has a `.env.example` that lists every variable the app reads, kept in sync with the
README, plus one command to start the app locally (documented in CLAUDE.md).
