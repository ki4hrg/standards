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
