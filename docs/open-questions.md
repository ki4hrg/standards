# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

## Checking a LAN-only app's revision automatically

Today a LAN-only app's deploy is checked by hand (`decisions.md`). The self-hosted runner is on
the LAN, so `dockhand-deploy.yml` could take an optional input naming a runner for its revision
check, defaulting to `ubuntu-24.04` (a compatible `v1` change). The check would have to be its
own job holding no secrets (only a read-only token for the commit comparison): `workflow.md`
keeps the deploy and anything with a secret off that runner, because unreviewed PR code runs
there. Also against it: the deploy result then depends on that runner being up. Undecided.
