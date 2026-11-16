# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

## Checking a LAN-only app's revision automatically

Today a LAN-only app's deploy is checked by hand (`decisions.md`). The self-hosted runner is on
the LAN, so `dockhand-deploy.yml` could take an optional input naming a runner for its revision
check, defaulting to `ubuntu-24.04` (a compatible `v1` change). The check would have to be its
own job holding no secrets (only a read-only token for the commit comparison): `workflow.md`
keeps the deploy and anything with a secret off that runner, because unreviewed PR code runs
there. Also against it: the deploy result then depends on that runner being up. Undecided.

## Field errors in `ActionForm`

The decided `ActionForm` (`decisions.md`, not built yet) shows the action's returned error in
place. It doesn't say whether it also shows per-field errors next to their inputs, or what shape
an action returns them in. Swept apps already return zod's `fieldErrors` alongside the message
and show only the message until the kit's `ActionForm` exists; John chose (2026-11-10) to wait
for it rather than build one per app. Building it means settling that shape first, and those
apps adopt it first.

## Token names in an app without Tailwind

`design.md` names the tokens (`page`, `card`, `accent`, `radius-card`…) but not how their custom
properties are spelled. Tailwind 4 apps get `--color-page` and `--radius-card` from `@theme`. An
app without Tailwind (multi-google-mcp, Phase 5: server-rendered Fastify, no Tailwind, strict CSP)
used the same Tailwind-style names so that the names match across repos. Undecided: whether that
spelling is the standard for every app, or whether a non-Tailwind app may use plain `--page`.
Reported 2026-11-14 by a migration session.

## Confirming a destructive action when JavaScript doesn't run

`design.md` says destructive actions confirm inline, never with `confirm()`. Under a strict CSP
with no JavaScript (multi-google-mcp, Phase 5), an inline confirm needs `app.js`, so the agent
hid Unlink and Disconnect until it runs: no one-click destructive action, and no dead button
either. The other option is a server-rendered confirm step, a second page or form with a real
Confirm button that works without JavaScript. Undecided: which one the standard requires, and
whether hiding the control until JavaScript runs is acceptable. Reported 2026-11-14 by a
migration session.

Data point: for multi-google-mcp (PR #19) John chose hiding the control until `app.js` runs. He
answered for that repo only (relayed 2026-11-14), so it is not a standard yet; the standard
question stays open.

## WordPress plugin: reusable check workflow

The WordPress profile describes its CI (phpcs, phpstan, JS lint and build, PHPUnit in wp-env, the
tag release) but no reusable workflow exists for it. `php-check.yml` runs Laravel's composer
scripts and a MySQL service. Undecided: whether to write `wordpress-check.yml` (and a release
workflow) as reusable workflows at `@v1` (a compatible addition), or to leave WordPress plugins to
copy their reference plugins. Reported 2026-11-14 by a migration session (Phase 0 audit).

## merge-on-green where a merge isn't a release

`merge-on-green`'s `workflow` input can be empty, which skips the dispatch of the main pipeline
after a merge. Undecided: whether a repo that releases from a tag (a WordPress plugin, no deploy)
sets it empty, and whether its `ci.yml` should still run on push to `main` at all. Running it saves
about 11 minutes per merge but leaves main untested by any run except the PR's. Reported
2026-11-14 by a migration session (Phase 0 audit).

## WordPress reference plugins and the version bump

The WordPress profile says to copy "the two most recent plugins built this way" and their release
workflow, bump script and updater, but names neither plugin, and no bump script is in the standards.
Undecided: which local plugins are the references, and whether the bump script is written once here
as a template. Reported 2026-11-14 by a migration session (Phase 0 audit).

## A self-hosted runner for a repo outside the organization

`decisions.md` moves app repos into the organization, where one runner pool serves them all. A
repo under a separate account can't use that pool without its updater changing: its release-updater
token is tied to the account, and moving it means a new site token and a release that changes the
updater's `REPOSITORY`. Undecided: whether such a repo moves to the organization or keeps GitHub's
runners. Reported 2026-11-14 by a migration session.

## WordPress Dependabot: framework majors

The Next.js template holds framework majors (`next`, `react`, `tailwindcss`, `typescript`) for
planned work. The WordPress profile names no equivalent, so Dependabot would open
`@wordpress/scripts` and `@wordpress/env` majors inside the routine group. `@wordpress/scripts` 37
needs Node 22.22 or later, which the Node 24 rule already covers. Undecided: whether those two
packages' majors are planned, as the Next.js ones are. Recommended: yes, the same way. Reported
2026-11-14 by a migration session.

Data point: John chose, for one private WordPress plugin only (relayed 2026-11-14), that
Dependabot ignores the `@wordpress/scripts` and `@wordpress/env` majors. Not a standard yet.

## design.md inside WordPress admin and theme output

`design.md` applies to every app, but two things in a WordPress plugin don't fit it cleanly: the
admin uses WordPress's own sentence-case UI, not the app's shared copy rules, and the front-end
output is styled by the active theme, so tokens and dark mode apply only where the plugin owns the
markup. Undecided: which parts of `design.md` a WordPress plugin follows, and where. Reported
2026-11-14 by a migration session.

## "Newest supported PHP" in a test matrix

The WordPress profile runs PHPUnit "across the oldest and newest supported PHP versions", but
"supported" isn't defined. Undecided: whether the newest is the highest version the plugin's
`Requires PHP` header allows and that PHP still supports (security fixes), or the newest released.
Reported 2026-11-14 by a migration session.

## When to move PHPCompatibilityWP to 10.x

The WordPress profile pins PHPCompatibilityWP 2.1.8, whose stable base (PHPCompatibility 9.3.5,
2019) knows little of PHP 8.x; PHPUnit on the newest PHP in the matrix is the real check. 10.x is
still alpha. Undecided: the condition for moving (for example, a stable 10.0 that passes the
plugins' own code). Reported 2026-11-14 by a migration session (Phase 1). The version numbers are
the peer's; not checked here.

## Python service: `python-check.yml` in steps

`python-check.yml` always runs `uv sync --locked`, `ruff check`, `ruff format --check` and pytest,
and pytest fails with no tests. It has no input to run a subset, unlike node-check's `scripts`, so
a Python repo adopting Phase 1 in steps must also bring uv, a ruff-clean tree and at least one
test in the same PR. Undecided: an optional input (for example `pytest: true`, `ruff: true`) with
defaults that keep current callers unchanged, a compatible addition at `v1`. Reported 2026-11-14
by a migration session (Phase 0 audit).

## Python service: template completeness

`templates/python-service/` holds only `ci.yml`. The profile calls for a Dockerfile, `.dockerignore`
and `compose.yaml`, and a `pyproject.toml` starter. A repo that copies the template also needs a
uv-covering `dependabot.yml`, a PR template, and `.claude/settings.json`. Undecided: whether to
write these now, and against which real service they are checked (none in the standards is
built). Reported 2026-11-14.

## Python service: a container without HTTP

Nothing says how a container with no HTTP server exposes its revision and health. A candidate: a
heartbeat file, written by the scheduler and read by a Docker `HEALTHCHECK`, with its revision in
an image label. Undecided: whether that is the standard for non-HTTP services, and where the
revision is read from. Reported 2026-11-14 by a migration session.

Data point: for one service (YNAB Balance Monitor, relayed 2026-11-14), a scheduled run that fails
logs the error, sends an Apprise notification and waits for the next run. Per-repo, not a standard.

## Python service: env_file and optional guards

`${VAR:?}` guards in `compose.yaml` catch missing variables, but `env_file:` bypasses them, and
`deploy.md` doesn't say how Dockhand supplies a stack's variables. A guard also can't say "one of
these variables is required". Undecided: whether `env_file:` is banned for required values, how
Dockhand supplies them, and the pattern for a choice between variables. Reported 2026-11-14.

Data point: for one service (YNAB Balance Monitor, relayed 2026-11-14), the stack supplies its
variables through Dockhand's stack environment, which interpolates `${VAR}`, so its compose file
moves from `env_file:` to an `environment:` list with `${VAR:?}` guards. Per-repo, not a standard.

## Python service: Python version upgrade rule

The profile says "current stable minus one (3.13 today)". Node has a rule (Node 24 LTS, upgraded in
every sweep); Python has none. Undecided: the rule for when a Python version moves, and whether
that is a sweep item the way Node 24 is. Reported 2026-11-14.

## Python service: pip-audit threshold and ignores

`security.md` says audits fail on high and above, but `security.yml`'s uv path runs
`pip-audit --strict`, which fails on any advisory, and it has no input for ignoring one. Undecided:
whether pip-audit gets the same severity threshold as npm (pip-audit may not report severity the
same way), and whether `security.yml` gains an ignore input for an advisory that has no fix.
Reported 2026-11-14 by a migration session.

## ruff format: its own PR, or a commit in the Phase 1 PR

The Prettier rule (a formatting-only PR, the commit in `.git-blame-ignore-revs`) is decided for
JavaScript. The Python profile doesn't say whether `ruff format` follows it. Undecided: the general
rule. Data point: for one service (YNAB Balance Monitor, relayed 2026-11-14), John chose a one-file
`ruff format` as its own commit in the Phase 1 PR, named in `.git-blame-ignore-revs`, because
python-check gates `ruff format --check` from Phase 1. Per-repo, not a standard.

## Laravel: a staging environment beside a manual production gate

`runcloud-deploy.yml` can serve one environment per caller. A repo that publishes staging on every
merge and production only by manual dispatch needs two calls, each with its own deploy branch and
health URL (`health-url`). The Laravel profile doesn't say how that fits: which branch and
environment protection each uses, whether production's gate is a dispatch or an environment
approval, and what the staging check proves. Undecided. Reported 2026-11-15 by a migration session
(Phase 0 audit of a Laravel repo).

## `runcloud-deploy.yml`: an empty `health-url` falls back to `APP_HEALTH_URL`

In `runcloud-deploy.yml`, an empty `health-url` uses the repo's `APP_HEALTH_URL` variable. A caller
with two environments therefore can't turn the check off for one of them. If it forgets the
staging URL, the staging job polls production's URL and fails after `wait-minutes`, a confusing
failure that looks like a slow deploy. The workflow has no `environment:` input, so the variable
can't be scoped per environment either. The reporting repo works around it by setting both URLs.
Options: a sentinel such as `health-url: none` meaning "no check" (a compatible `v1` change); an
`environment` input so `vars.APP_HEALTH_URL` resolves per environment (compatible, but that
environment's protection rules then gate the deploy job); or failing fast when the
URL is the same for two deploy branches (a single call can't see the other call's URL, so this
would be a caller-side check, not the workflow's). Undecided. Reported 2026-11-16 by a migration
session (Laravel repo on RunCloud).

## Freezing deploys around event days

A repo that runs live events may need production deploys frozen for a period, manual dispatch only
during event season. No standard covers a freeze: where it is set (a variable, a branch rule, the
caller's `if:`), who lifts it, and whether a freeze also stops the automatic staging publish.
Undecided. Reported 2026-11-15 by a migration session.

## A second Redis for one test

`php-check.yml` starts one Redis (`redis-image`, port 6379). A test that needs a second, non-persistent
store can point at the same service through the new `env` input, if one Redis serves it. A second
process needs a second service, and services can't be set from an input in a reusable workflow
except by a named input (the same way `redis-image` works). Undecided: whether a second-Redis input
is wanted, or the test should share the first. Reported 2026-11-15.

## A single-user tool with no sign-in

`security.md` assumes requests are authenticated where they arrive, and has no rule for a
single-user tool that has no sign-in of its own. Data point, John 2026-11-16, for one public tool:
no in-app sign-in; it relies on the network or a reverse proxy's auth, recorded as a per-repo
exception, but the app still refuses cross-site writes (checking `Origin` or `Sec-Fetch-Site`) and
requests for unknown `Host` names (DNS rebinding). Undecided: whether that becomes a rule for every
such tool. Reported 2026-11-16 by a migration session.

## Public repos and the move into the organization

`decisions.md` says app repos move into John's organization as they're swept. Data point, John
2026-11-16: a public repo can stay on his personal account, because his "no pushes to the personal
account" rule was about Actions minutes, which public repos don't use. The recorded reason for the
move (an organization runner token instead of a repo-level Administration token) is about the
self-hosted runner, which public repos never use either. Undecided: whether `decisions.md` carves
out public repos. Reported 2026-11-16 by a migration session.
