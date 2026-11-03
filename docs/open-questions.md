# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

## Token names in a shadcn/ui app

An app built on shadcn/ui uses its token names (`background`, `foreground`, `card`, `muted`,
`primary`, `accent`, `destructive`), and the primitives in `components/ui` depend on them.
`design.md` names `page`, `card`, `sunk`, `line`, `ink`… Does Phase 5 rename everything, or keep
both?

Recommendation: the standard tokens hold the values, and shadcn's names are defined as aliases of
them (`--background: var(--page)`), used only inside `components/ui`. App code uses the standard
names; the primitives and `shadcn add` keep working unedited; the contrast check runs over the
standard tokens. The aliases go when the shared kit replaces the primitives (Phase 6). Note that
`card` and `accent` exist in both sets with different meanings (shadcn's `accent` is a hover
tint, ours is the primary action), so those two need mapping, not just aliasing.

## Renaming MCP tools to `snake_case`

An existing server with kebab-case tools used daily through a claude.ai connector: hard cut, or
both names for a while?

Recommendation: hard cut, one PR with a `!` title and an old → new table in the description, and
John told before it merges. Clients read the tool list each session, so the model picks up the
new names at once. What breaks is anything outside that names a tool (project instructions,
skills, saved prompts) and per-tool permission choices in the client, which reset. Registering
both names doubles the tool list (59 → 118 here), which costs context and hurts tool choice on
every call for the whole overlap.
