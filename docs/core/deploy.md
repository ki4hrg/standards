# Deploy

Applies to anything that runs as a container. WordPress plugins and Laravel apps deploy
differently (see their profiles). The goal of the revision check below holds for them too: a
deploy isn't done until the app reports the commit that was deployed.

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
- Tags: `:main` (mutable, what compose pulls) and `:sha-<short sha>` (immutable, for rollback;
  `docker/metadata-action`'s `type=sha`, 7 characters). The full commit is in the revision label.
- Labels: OCI labels from `docker/metadata-action`, including `org.opencontainers.image.revision`.
  `GIT_REVISION` is also passed as a build arg so the app can report it.
- Platform matches the deploy host. Build arm64 natively on `ubuntu-24.04-arm`, not under QEMU,
  which makes a Next.js build crawl. Record the host's architecture in `docs/DEPLOYMENT.md`.
- Runs as a non-root user. Directories the app writes (data volumes) are created and handed to
  that user before `USER`.
- Multi-stage build; the runtime stage carries only what runs.
- Base images are literal tags in `FROM` (`node:24-alpine`), not built from an `ARG`, so
  Dependabot can see and update them.
- A new GHCR package starts **private**. Make it public, or give Dockhand registry credentials.

## Compose

File name `compose.yaml`. For the app service:

- `image: ${APP_IMAGE:-ghcr.io/<owner>/<repo>:main}`, `pull_policy: always`, and **no `build:`**.
  Dev-only extras go in `compose.dev.yaml`, never `compose.override.yaml`, which compose loads
  automatically.
- Required secrets as `${VAR:?set VAR}`; optional values as `${VAR:-default}`. Compose checks
  every guard in the file even when starting only `db`, so for local runs copy `.env.example` to
  `.env` (its placeholders satisfy the guards). When the app's dev mode depends on a secret being
  *absent* (no mail key → a log mailer) and reads the same `.env`, give the placeholders to
  compose only instead: inline in the script that starts the dev database, or a separate
  `--env-file`. Never weaken a guard for dev.
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
- The app gets `DATABASE_URL` **without** a password, plus `PGPASSWORD`. postgres.js and
  node-postgres read `PGPASSWORD`; **Prisma doesn't** (it fails with P1000). A Prisma app keeps
  the same compose variables and has its entrypoint put the encoded password into the URL before
  anything connects:

  ```sh
  if [ -n "$PGPASSWORD" ]; then
    DATABASE_URL=$(node -e 'const u = new URL(process.env.DATABASE_URL);
      u.password = encodeURIComponent(process.env.PGPASSWORD); process.stdout.write(u.href)')
    export DATABASE_URL
  fi
  ```

  `encodeURIComponent` is what keeps `/ @ : % # ?` in a password from breaking the URL.
- Backups, when the database holds anything that can't be recreated: either a `backup` service
  (nightly `pg_dump -Fc`, kept N days, with the backup volume copied off the host), or a
  consistent snapshot of the whole VM taken off the host (Proxmox `vzdump` in snapshot mode with
  the QEMU guest agent's filesystem freeze, or with the database stopped). A plain file copy of a
  running database's volume is neither: it may not restore. Say which in `docs/DEPLOYMENT.md`.

Network exposure is per host: either publish a port bound for the reverse proxy, or join the
proxy's external network with no published port. When the app trusts a proxy header, it must not
be reachable except through the proxy: bind the published port to the interface the proxy
connects on (`127.0.0.1:${APP_PORT}:3000` when the proxy is on the same host, never a bare
`${APP_PORT}:3000`, which listens on every interface), or join the proxy's network, and trust
only the proxy's address (Fastify `trustProxy: '<proxy ip>'`, not `true`). Otherwise anyone who
reaches the port directly sets their own `X-Forwarded-For`.

When the proxy runs on another machine (on the firewall, say), the port is published on the
host's LAN interface. That is allowed with two guards: trust only the proxy's address, which
stops a spoofed `X-Forwarded-For`, and have the host firewall admit the port only from the proxy,
which stops requests that skip the proxy's TLS and limits. Record the exposure, and both guards
when they apply, in `docs/DEPLOYMENT.md`.

## Health endpoint

`GET /api/health`: no auth, no database call, never cached (Next.js: `dynamic = 'force-dynamic'`),
returns `{ ok: true, revision }`. Its job is to tell whether the process is serving and which commit it
runs, not to test dependencies; the database has its own healthcheck.

## Migrations

Applied by the container entrypoint before the server starts. Never `db push`. Each profile says
how (Drizzle: `templates/nextjs-app/docker-entrypoint.sh`).

## Deploy modes

**A. Dockhand git stack (default).** Dockhand tracks the repo's `compose.yaml`. In the stack's
settings, turn on **Force redeploy** and **Re-pull images**. Without them a webhook redeploys only
when the git commit changed, and doesn't pull a newer image for the same tag, so two merges
minutes apart leave the second image unpulled. (The webhook itself takes no force option.) The
`deploy` job calls the stack's webhook after the image is pushed:

- a plain `GET`; the secret goes in the `?secret=` query parameter, not a header;
- `DOCKHAND_WEBHOOK_URL` and optional `DOCKHAND_WEBHOOK_TOKEN` read from Secrets or Variables;
- skipped cleanly when the URL is not set (forks, new repos);
- **fails unless the JSON body says `success: true`**: Dockhand answers 200 even when the stack
  fails to come up;
- **checks the running revision** when the `APP_HEALTH_URL` variable is set (the app's
  `/api/health`, reachable from GitHub's runners): it waits up to 5 minutes for this commit, or a
  later one, to be serving. Dockhand decides whether to redeploy by the git commit, not the image,
  so a stack without the settings above answers `success: true`, "No changes detected" without
  pulling. Without `APP_HEALTH_URL`, that reply fails the job.

The reusable `dockhand-deploy.yml` does all of this.

**B. Service embedded in another stack.** When the service runs inside a stack this repo doesn't
own, there is no webhook. Publish on version tags (`:latest` plus `:X.Y.Z`) and let the host's
auto-update (Dockhand auto-update or Diun) pull, or redeploy by hand. Say which in
`docs/DEPLOYMENT.md`.

## Rolling back

Revert the commit (a `revert:` PR) so the image and `compose.yaml` go back together. Pointing
`APP_IMAGE` at an older `:sha-` tag under the current compose fails when the compose has moved on:
a healthcheck changed to `/api/health` fails against an image from before that route existed.
If you must pin an image by hand, use the compose from the same commit.

## Checking what's running

Compare the revision `/api/health` reports (or the image's `org.opencontainers.image.revision`
label) with `git rev-parse HEAD`. The tag name proves nothing. Before an app has `/api/health`
(migration Phase 2), read the label:
`docker inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' <container>`.
