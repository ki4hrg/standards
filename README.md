# standards

Engineering standards for my personal projects: how code is written, reviewed, shipped and
deployed, and how agents are expected to work in a repo. It is three things in one repo:

- **Written standards** in `docs/`, each rule with its reason.
- **Reusable GitHub Actions workflows** in `.github/workflows/`, called from each project so a fix
  to CI or deploy lands everywhere at once.
- **A Claude Code plugin** (this repo's root) with skills that apply the standards:
  `new-project`, `ship`, `conform` and `ui-verbosity-reduction`.

Scope: my personal projects (the `ki4hrg` account) and, until Foundry Collaborative has its own
standards, Foundry projects too. The standards apply to **new projects** first. Bringing existing repos up to them is a
separate effort.

## Layout

| Path | What |
|---|---|
| `docs/decisions.md` | Every standard, the decision behind it, and where it came from. Start here. |
| `docs/core/` | Cross-stack rules: `workflow.md` (branches, PRs, merging, review), `agent-docs.md` (CLAUDE.md and docs/), `security.md`, `deploy.md`. |
| `docs/profiles/` | Per-stack rules: Next.js app, Python service, WordPress plugin, Laravel app. |
| `docs/design.md`, `docs/mcp.md` | Design language and the MCP server conventions. |
| `docs/open-questions.md` | Undecided items. Nothing there is a standard yet. |
| `docs/migration/checklist.md` | Phase-by-phase checklist for bringing an existing repo up to standard, with a handoff block. |
| `.github/workflows/` | Reusable workflows: `node-check`, `python-check`, `security`, `image`, `merge-on-green`, `dockhand-deploy`. |
| `templates/` | Starting files per profile, copied by the `new-project` skill. |
| `skills/` | The plugin's skills: `new-project`, `ship`, `conform`, `ui-verbosity-reduction`. |
| `scripts/repo-settings.sh` | Applies the standard GitHub repo settings and labels. |

## Using it

**Reusable workflows.** Call them by major tag:

```yaml
jobs:
  check:
    uses: ki4hrg/standards/.github/workflows/node-check.yml@v1
```

`v1` is moved forward for compatible changes. Breaking changes get `v2`, and projects move when
they choose. `templates/*/.github/workflows/ci.yml` shows a complete caller.

**Plugin.** Projects enable it in `.claude/settings.json`, which also makes it available in
Claude Code on the web:

```json
{
  "extraKnownMarketplaces": {
    "ki4hrg-standards": { "source": { "source": "github", "repo": "ki4hrg/standards" } }
  },
  "enabledPlugins": { "standards@ki4hrg-standards": true }
}
```

Locally: `/plugin marketplace add ki4hrg/standards`, then `/plugin install standards@ki4hrg-standards`.

## Changing a standard

Edit the doc and record the change in `docs/decisions.md` with the reason. A rule an agent
proposes goes to `docs/open-questions.md` until I accept it. This repo is public: no secrets,
hostnames, or details of private projects.
