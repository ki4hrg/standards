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
migration session; John is being asked.
