# Open questions

Undecided. Nothing here is a standard until it moves to `decisions.md`.

## Design

- **Subtitles and empty states.** Two of my projects disagree. One allows an optional one-line page
  description and shows "None added" in an empty card. The other bans subtitles and collapses an
  empty section to its muted header with its action, keeping a full empty state only for a page
  whose only list is empty. `design.md` currently follows the second for subtitles and is silent
  on empty cards.
- **Count badges in card headers.** One project bans them as noise. Undecided elsewhere.
- **Modal vs inline for creating records.** `design.md` allows either; one project prefers inline
  expansion inside the card.
- **Shared component kit.** Token names are shared; components are not. Whether to share a small
  kit (Button, Card, Section, PageHeader, IconButton, StatusBadge, EmptyState) once a second app
  starts from the template.

## Stack

- **Distribution of shared packages** (MCP OAuth server, auth): public npm, a git dependency on a
  public repo, or GitHub Packages (which needs a token even for public packages).
- **Formatter.** Prettier is used in only two projects, with different settings. Options: Prettier
  with defaults, Biome, or none (lint only).
- **Python packaging.** `docs/profiles/python-service.md` assumes uv with a committed `uv.lock`.
  Confirm.

## Workflow

- **Dependabot PRs and automerge.** Dependabot-triggered workflows get a read-only token, so
  `merge-on-green` can't merge them. Options: merge by hand (current), a `pull_request_target`
  workflow scoped to Dependabot, or a personal token as a Dependabot secret.
- **GitHub Pro.** If I upgrade, required checks and native auto-merge would replace
  `merge-on-green` and also block direct pushes to `main`.
