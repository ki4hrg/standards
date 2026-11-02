# Agent docs

What a repo tells an agent, and where.

## CLAUDE.md

Loaded into every session, so it costs context every time. It stays **about 150 lines or fewer**
and holds only:

1. One paragraph: what the app is, its stack, and links to `docs/`.
2. **Commands:** dev, typecheck, lint, test, migrations. State which must pass before work is
   called done.
3. **Rules that are easy to break:** invariants a newcomer would get wrong, each with its reason
   in a clause. Examples: "every query takes a scope", "routes under `app/api/` are not guarded by
   the layout".
4. **Layout:** a short map of where things live, enough to find the rest.
5. Repo-specific exceptions to these standards, if any (for example, direct pushes to `main`).

It does **not** hold:

- **Rules shared by every project.** They live in this repo, which the plugin makes available.
  Don't copy "Conventional Commits", "pull_policy: always" and the like into a project's CLAUDE.md.
- **Domain specs, data models, feature descriptions:** use `docs/SPEC.md` or `docs/ARCHITECTURE.md`.
- **Incident stories:** put the lesson in a code comment where the trap is, with the commit or
  issue number. Write "why" comments generously in infra files (Dockerfile, compose, workflows).
- **Change logs and status:** git history, issues, and `docs/HANDOFF.md` for multi-issue efforts.
- **Claims about other repos** ("fleet-wide", "like every project"). Only this repo speaks for
  every project.

## docs/

| File | Holds |
|---|---|
| `docs/SPEC.md` | What the app does and why: the agreed design. Read before changing the data model or a workflow. |
| `docs/ARCHITECTURE.md` | How it is built: modules, data flow, auth and route-guard table, jobs, integrations. |
| `docs/DECISIONS.md` | Dated project decisions with the reason and the options rejected. One entry per decision, newest last. Once it outgrows a quick read, it opens with an index (one line per decision still in force, linking to its entry: the entry's title is enough when it states the decision, with a few words added only when it doesn't), and a replaced decision is marked "Superseded by …" with a link rather than edited or deleted. Agents read the index and search; they don't read the whole log. |
| `docs/DEPLOYMENT.md` | Env vars, secrets, backups, the deploy mode, the host's architecture. |
| `docs/HANDOFF.md` | Where a multi-issue effort stands, such as a migration sweep. A single issue's handoff is a comment on the issue (see `workflow.md`). |
| `docs/claude-candidates.md` | Rules an agent proposes. Not binding. |
| `docs/plans/` | Plans for work that needs more than one PR or session, linked from its issue. |

Create a file when there is something to put in it; an empty skeleton is noise.

## Keeping it current

- **Facts:** if a change moves, renames or removes something CLAUDE.md or `docs/` names, update it
  in the same PR. A stale doc is worse than none: an agent will follow it.
- **Rules:** an agent that learns something that looks like a rule appends it to
  `docs/claude-candidates.md` with the date, the rule, why, and the PR it came from. It does not
  add the rule to CLAUDE.md. I promote, rewrite or reject candidates. A candidate that applies
  to every project goes to this repo's `docs/open-questions.md`.
- Before compacting or rewriting a CLAUDE.md, sort its rules into: contradicts a standard (drop),
  project fact (move to `docs/`), real candidate (parking lot). Only the last needs my decision.

## Tool-generated blocks

Some tools inject their own agent instructions (for example, a block written into `AGENTS.md` by
`next dev`). Keep `AGENTS.md` as a one-line pointer to CLAUDE.md and gitignore any regenerated
blocks rather than committing them.
