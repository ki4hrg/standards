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
  `feat fix docs refactor perf test build ci chore revert`. Scope is optional. Add `!` for a
  breaking change to data or an external interface (MCP tools, webhooks, env vars).
- Commits on the branch can be anything; nobody reads them after the squash.

## Merging

PRs merge themselves when CI is green.

1. Before opening the PR, the agent runs the checks locally and the reviews below, and fixes what
   they find.
2. The agent opens the PR and adds the `automerge` label, unless the person asked to look first.
3. CI runs. When every job passes, `merge-on-green` squash-merges the exact commit that was
   tested and starts the `main` pipeline, which builds the image and deploys.
4. The agent watches CI and reports the merge and the deploy. It does **not** merge the PR itself:
   merging seconds after opening, before CI ran, is how broken builds used to reach `main`.
5. If CI fails, the agent fixes it on the same branch. A PR is not finished until it is merged or
   the person has been told why it is not.

Remove the label, or open the PR as a draft, to hold a change for a person to review: schema
changes that drop data, changes to auth, anything the session was unsure of.

## Review

There is no human review before merging, so review happens in the session:

- **Always:** `/code-review` on the branch diff before opening the PR. Fix the findings, or say in
  the PR why a finding does not apply.
- **When the diff touches a sensitive path:** `/security-review` as well. Sensitive means:
  authentication, sessions or OIDC; the OAuth server or MCP endpoint; permission or tenancy
  checks; public (unauthenticated) routes and forms; inbound email or webhooks; secrets,
  encryption or tokens; file uploads.
- CI adds a dependency audit, and the GitGuardian app scans for secrets (`security.md`).

## Plans and handoffs

- A plan for work larger than one session goes in `docs/` in the repo (`docs/plans/<topic>.md` or
  `docs/SPEC.md`), never only in `~/.claude/plans/`, which is local to one machine and gets
  cleaned up.
- A session that stops partway writes `docs/HANDOFF.md`: dated, with what was done, what was
  verified, what was not, and where to resume.
- Work items live in GitHub issues.

## Versions and releases

- Apps are unversioned: merging to `main` is the release.
- Distributed artifacts (WordPress plugins, add-ons, anything someone installs) use `vX.Y.Z` tags.
  CI checks that the tag matches the version in the code, then publishes with
  `gh release create --generate-notes`.

## Local development

Every repo has a `.env.example` that lists every variable the app reads, kept in sync with the
README, plus one command to start the app locally (documented in CLAUDE.md).
