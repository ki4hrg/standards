# Profile: Python service

A small service or scheduled job that runs as a container (a monitor, a digest, a checker). The
core docs apply in full, including `deploy.md`.

## Stack

| Piece | Choice |
|---|---|
| Python | Current stable minus one (3.13 today), pinned in `pyproject.toml` and the Dockerfile |
| Packaging | uv, with `uv.lock` committed; `uv sync --locked` in CI and the image |
| Layout | `src/<package>/` with `pyproject.toml`; entry point as a console script |
| Config | `pydantic-settings`, validated at startup; `.env.example` lists every variable |
| Lint/format | ruff (`ruff check`, `ruff format --check`) |
| Tests | pytest |

Even a single-file utility gets ruff and at least one test of its pure logic. Upper-bound the
major version of any dependency whose API has changed before.

## CI

`templates/python-service/.github/workflows/ci.yml` calls the reusable `python-check.yml`
(ruff and pytest) and `security.yml` (`pip-audit`), then `image.yml`, then
`dockhand-deploy.yml` for deploy mode A, or publishes version tags for mode B (`../core/deploy.md`).

## Image

- `python:3.x-slim`, uv copied from its official image, `uv sync --locked --no-dev`.
- Non-root user, `HEALTHCHECK` if the service serves HTTP, `.dockerignore`.
- Build for the deploy host's architecture.

## Released tools

A service that other people install, or that is pulled into another stack (deploy mode B),
is versioned: `version` in `pyproject.toml`, `vX.Y.Z` tags, a CI check that they match, and
`gh release create --generate-notes`.
