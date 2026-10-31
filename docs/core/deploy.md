# Deploy

Applies to anything that runs as a container. WordPress plugins and Laravel apps deploy
differently (see their profiles).

## Pipeline

```
PR:            check + security ──► image (build only) ──► merge-on-green
push to main:  check + security ──► image (build + push to GHCR) ──► deploy (Dockhand webhook)
```

The caller is `templates/nextjs-app/.github/workflows/ci.yml`. A red check produces no image, and
no image means no deploy. `workflow_dispatch` on `main` rebuilds and redeploys by hand.

## Image

- Built by GitHub Actions, pushed to GHCR as `ghcr.io/<owner>/<repo>` (lowercased; GHCR rejects
  uppercase).
- Tags: `:main` (mutable, what compose pulls) and `:sha-<sha>` (immutable, for rollback).
- Labels: OCI labels from `docker/metadata-action`, including `org.opencontainers.image.revision`.
  `GIT_REVISION` is also passed as a build arg so the app can report it.
- Platform matches the deploy host. Build arm64 natively on `ubuntu-24.04-arm`, not under QEMU,
  which makes a Next.js build crawl. Record the host's architecture in `docs/DEPLOYMENT.md`.
- Runs as a non-root user. Directories the app writes (data volumes) are created and handed to
  that user before `USER`.
- Multi-stage build; the runtime stage carries only what runs.
- A new GHCR package starts **private**. Make it public, or give Dockhand registry credentials.

## Compose

File name `compose.yaml`. For the app service:

- `image: ${APP_IMAGE:-ghcr.io/<owner>/<repo>:main}`, `pull_policy: always`, and **no `build:`**.
  Dev-only extras go in `compose.dev.yaml`, never `compose.override.yaml`, which compose loads
  automatically.
- Required secrets as `${VAR:?set VAR}`; optional values as `${VAR:-default}`.
- Healthcheck with Node's `fetch` against `http://127.0.0.1:3000/api/health` (alpine images have
  no curl). Give it a `start_period` long enough for migrations.
- `depends_on: db: condition: service_healthy`.
- `restart: unless-stopped`.
- A comment on every non-obvious line saying why.

For Postgres:

- `postgres:18-alpine`, volume mounted at `/var/lib/postgresql` (not `.../data`: PG18 keeps data in
  a versioned subdirectory).
- `pg_isready` healthcheck.
- No published port unless something outside the stack needs it.
- The app gets `DATABASE_URL` **without** a password, plus `PGPASSWORD`.
- A `backup` service (nightly `pg_dump -Fc`, kept N days) when the database holds anything that
  can't be recreated. Back up the backup volume off the host.

Network exposure is per host: either publish a port bound for the reverse proxy, or join the
proxy's external network with no published port. When the app trusts a proxy header, it must not
be reachable except through the proxy. Record which one in `docs/DEPLOYMENT.md`.

## Health endpoint

`GET /api/health`: no auth, no database call, `dynamic = 'force-dynamic'`, returns
`{ ok: true, revision }`. Its job is to tell whether the process is serving and which commit it
runs, not to test dependencies; the database has its own healthcheck.

## Migrations

Applied by the container entrypoint before the server starts. Never `db push`. Each profile says
how (Drizzle: `templates/nextjs-app/docker-entrypoint.sh`).

## Deploy modes

**A. Dockhand git stack (default).** Dockhand tracks the repo's `compose.yaml`. The `deploy` job
calls the stack's webhook after the image is pushed:

- a plain `GET`; the secret goes in the `?secret=` query parameter, not a header;
- `DOCKHAND_WEBHOOK_URL` and optional `DOCKHAND_WEBHOOK_TOKEN` read from Secrets or Variables;
- skipped cleanly when the URL is not set (forks, new repos);
- **fails unless the JSON body says `success: true`**: Dockhand answers 200 even when the stack
  fails to come up.

The reusable `dockhand-deploy.yml` does all of this.

**B. Service embedded in another stack.** When the service runs inside a stack this repo doesn't
own, there is no webhook. Publish on version tags (`:latest` plus `:X.Y.Z`) and let the host's
auto-update (Dockhand auto-update or Diun) pull, or redeploy by hand. Say which in
`docs/DEPLOYMENT.md`.

## Checking what's running

Compare the revision `/api/health` reports (or the image's `org.opencontainers.image.revision`
label) with `git rev-parse HEAD`. The tag name proves nothing.
