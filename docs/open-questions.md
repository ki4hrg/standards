# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

1. **A release-age gate vs a security fix.** pnpm's `minimumReleaseAge` (used by some repos; not a
   standard) holds back a same-day patch that the audit gate demands. Proposed: allow a scoped
   `minimumReleaseAgeExclude` for the patched package only, recorded in `docs/DECISIONS.md` with
   the advisory, and removed once the version is older than the gate.
