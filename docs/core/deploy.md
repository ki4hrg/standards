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

## Several images or lockfiles

A repo that builds more than one image (an app and a worker) or has a second lockfile in a
subdirectory (`worker/pnpm-lock.yaml`) repeats the template's jobs, once each. `image.yml` and
`security.yml` already take the inputs this needs; only the caller grows.

- **One `image` job per image**, e.g. `image` and `image-worker`. Every image after the first
  passes an explicit `image:` (`ghcr.io/<owner>/<repo>-worker`) as well as `file:` (and
  `context:` if it differs): the default name is the same for every job, so without one the
  second push overwrites the first under the same tag. Compose pulls each by that name, with
  `pull_policy: always`.
- **One `security` job per lockfile directory**, e.g. `security-worker` with
  `working-directory: worker`. One job covers several package managers in the same directory
  (`package-managers: pnpm uv`), not several directories.
- **Every repeated job is wired in like the original:** the same `if:` and `runs-on:` as the
  job it copies; each `image` job `needs` every check and security job; `automerge` `needs`
  all of them and lists all of them in `require-jobs` (a job missing there lets the label merge
  without it on a `labeled` run); `deploy` `needs` every `image` job, so a stack never
  redeploys with one image new and the other old.
- `.github/dependabot.yml` gets an entry per directory for the package ecosystem.
- The deploy's revision check (`APP_HEALTH_URL`) covers the app only. A worker without a health
  route is checked by hand after the first deploy: its container's
  `org.opencontainers.image.revision` label.

`image.yml` keeps a separate build cache per image name, so the jobs don't evict each other.

## Compose

File name `compose.yaml`. A repo whose Dockhand stack tracks another path (`docker-compose.yml`)
keeps that name until John repoints the stack: renaming the file alone leaves Dockhand deploying
the old file, which no longer changes. Rename it together with the stack's path, as its own
change. For the app service:

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
host's LAN interface. That is allowed, and the LAN may reach it, with two guards: the app trusts
only the proxy's address, which stops a spoofed `X-Forwarded-For`, and no app port is reachable
from the internet. Only 80 and 443 are public, through the proxy. Record the exposure and both
guards in `docs/DEPLOYMENT.md`.

## Health endpoint

`GET /api/health`: no auth, no database call, never cached (Next.js: `dynamic = 'force-dynamic'`),
returns `{ ok: true, revision }`. Its job is to tell whether the process is serving and which commit it
runs, not to test dependencies; the database has its own healthcheck.

## Migrations

Applied by the container entrypoint before the server starts. Never `db push`. Each profile says
how (Drizzle: `templates/nextjs-app/docker-entrypoint.sh`). The migrations directory is committed:
check `.gitignore` doesn't exclude it (`prisma/migrations/`, `drizzle/`), or the image ships none.

**Moving an existing app off `db push`.** Its live database already has the schema but no
migration history, so the first migration must be marked applied there, not run:

1. Generate a baseline migration (`0_init`) from the current schema, and keep a frozen copy of
   that schema beside it. Later migrations change the schema file, but the baseline copy never
   changes.
2. At boot, on a database that has tables but no migration table (`_prisma_migrations`, or
   Drizzle's `__drizzle_migrations`), compare the database with the **frozen baseline** (Prisma:
   `migrate diff` from the database to the baseline schema, with `--exit-code`). Empty: mark the
   baseline applied (`migrate resolve --applied 0_init`). Any difference: refuse and exit 1, so a
   database that drifted from what the baseline says is never marked as matching it. Comparing
   with the current schema instead would fail as soon as a second migration exists.
3. Then run the normal migrate step (`migrate deploy`).

The migration CLI in the image comes from the lockfile (copied from the build stage's
`node_modules`), never `npm install -g`: an unpinned CLI can be a different major from the
client. Prisma's CLI and `@prisma/client` stay on the same version. An empty database (a new
install) skips step 2 and runs every migration, the baseline included.

## Deploy modes

**A. Dockhand git stack (default).** Dockhand tracks the repo's `compose.yaml`. In the stack's
settings, turn on **Force redeploy** and **Re-pull images**. Without them a webhook redeploys only
when the git commit changed, and doesn't pull a newer image for the same tag, so two merges
minutes apart leave the second image unpulled. (The webhook itself takes no force option.) The
`deploy` job calls the stack's webhook after the image is pushed:

- a plain `GET`; the secret goes in the `?secret=` query parameter, not a header;
- `DOCKHAND_WEBHOOK_URL` and optional `DOCKHAND_WEBHOOK_TOKEN` read from Secrets or Variables
  (see below);
- skipped cleanly when the URL is not set (forks, new repos);
- **fails unless the JSON body says `success: true`**: Dockhand answers 200 even when the stack
  fails to come up;
- **checks the running revision** when the `APP_HEALTH_URL` variable is set (the app's
  `/api/health`, reachable from GitHub's runners): it waits up to 5 minutes for this commit, or a
  later one, to be serving. Dockhand decides whether to redeploy by the git commit, not the image,
  so a stack without the settings above answers `success: true`, "No changes detected" without
  pulling. Without `APP_HEALTH_URL`, that reply fails the job.

**An app reachable only on the LAN.** GitHub's runners can't reach its `/api/health`, so
`APP_HEALTH_URL` stays unset, and no public route is added just for the check. What stands in
for it: Force redeploy and Re-pull images on (above), so `success: true` means the stack really
was redeployed with a fresh pull, and a "No changes detected" reply still fails the job. After a
deploy, check the revision by hand from the LAN (`/api/health` or the image label, see
[Checking what's running](#checking-whats-running)) against the merged commit. Record in
`docs/DEPLOYMENT.md` that the app is LAN-only and its deploys are checked by hand.

The reusable `dockhand-deploy.yml` does all of this.

**Where the webhook settings live.** Either Actions tab works for either value. The template
passes both by name from Secrets; when a Secret isn't set, the value passed is empty and
`dockhand-deploy.yml` falls back to the repo Variable of the same name (Variables reach the
called workflow without being passed). So set each one under Secrets or Variables, not both: a
Secret wins, and a stale one hides the Variable you just changed. `DOCKHAND_WEBHOOK_URL` may
carry the secret inline (`…?secret=…`) with no `DOCKHAND_WEBHOOK_TOKEN`; then the URL itself is
the secret and belongs under Secrets.

**Moving from older webhook settings.** Repos that predate the standards often have one secret
holding the whole URL with `?secret=` inline (`DOCKHAND_WEBHOOK_SECRET`), or their own pair
(`WEBHOOK_URL` / `WEBHOOK_TOKEN`). Nobody can read a secret's value back out of GitHub, so an
agent can't copy it; John does the move:

1. Set `DOCKHAND_WEBHOOK_URL`, and `DOCKHAND_WEBHOOK_TOKEN` if the token is kept separate, from
   the stack's webhook in Dockhand. Copying an old inline URL unchanged into
   `DOCKHAND_WEBHOOK_URL` alone works too.
2. Merge the caller that passes the new names (the template's `deploy` job).
3. After its first deploy succeeds, delete the old secrets, so nothing keeps a second copy of the
   token.

Until John has set the new names, the deploy job is skipped (no URL), which reads as a green
run with nothing deployed. Say so in the PR, and don't treat the deploy as verified.

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
