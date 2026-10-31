# standards

John's engineering standards: docs, reusable GitHub Actions workflows, templates, and a Claude
Code plugin (this repo's root is the plugin). See README.md.

## Rules

- **Public repo.** No secrets, hostnames, IPs, private repo names or details of private projects,
  in files or commit messages. `private/` is gitignored and holds the survey material; never
  move anything from it into a tracked file without checking.
- **A standard is only what `docs/decisions.md` lists.** Changing or adding one means updating
  `docs/decisions.md` with the reason and provenance. A rule John hasn't decided goes to
  `docs/open-questions.md`.
- **Reusable workflows are called at `@v1` by every project.** A change to an input's name,
  default or meaning, or to a job name a caller `needs`, is breaking: it goes to `v2`. Compatible
  changes move the `v1` tag forward after `main` is green. Keep templates' callers in sync with
  the inputs.
- **Docs never get ahead of `v1`.** A doc, template or skill change that relies on a new workflow
  input or behaviour lands in the same push as the workflow change, and the `v1` tag moves to
  that commit before anyone is told to use it. Otherwise a repo following the docs calls an
  input `v1` doesn't have yet.
- Workflows: least-privilege `permissions`, runners pinned to `ubuntu-24.04`, a comment explaining
  every non-obvious step.
- Skills reference the docs by path relative to the plugin root. If you move a doc, update the
  skills that name it.
- Write rules with their reason.

## Layout

`docs/` standards · `.github/workflows/` reusable workflows · `templates/<profile>/` starting
files · `skills/` plugin skills · `.claude-plugin/` plugin and marketplace manifests ·
`scripts/` helpers.
