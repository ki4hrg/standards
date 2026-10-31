# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

## Deploy

- **Making Dockhand pull a new image for an unchanged commit.** Dockhand redeploys a git stack only
  when the commit changes, so a deploy that races an earlier one can leave the new image unpulled.
  `dockhand-deploy` now detects this (revision check, or failing on "No changes detected"), but
  the fix is a manual redeploy. Options: a Dockhand webhook parameter that forces a pull, if one
  exists; Dockhand's own image auto-update; or tagging compose with the commit's image.
