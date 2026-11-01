# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

- **A shared action-form wrapper in the component kit?** One client component (`ActionForm`)
  that runs a server action, shows the returned error in place, calls `onDone` only on success,
  keeps typed values on refusal and lets `redirect()` through. Proposed from a migration where it
  replaced per-form copies of the same logic. Would join the kit's list in `decisions.md`.
