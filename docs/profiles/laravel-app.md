# Profile: Laravel app

Laravel apps so far are Foundry work. This profile applies until Foundry's own standards replace
it. It is drawn from the most mature Laravel project and is less settled than the other
profiles: question it when it does not fit.

## Stack

- Laravel (current major), PHP pinned with `config.platform.php`, Livewire for interactive admin
  screens, Blade and plain JS where interactivity is light, Tailwind 4 via Vite.
- MySQL 8.4 or PostgreSQL, Redis for queues and cache.
- Pint, Larastan (level 5 or higher), Pest. One `composer check` script runs all three.
- Front-end packages with npm (lockfile committed). Move to pnpm only when an advisory needs a
  per-advisory ignore, which npm can't do (`../core/security.md`).

## CI

- On every PR: Pest against a real database service container, Pint `--test`, Larastan, and
  `security.yml` (composer audit, npm audit); GitGuardian for secrets.
- The reusable `php-check.yml` runs the front-end build, then the composer scripts: a broken
  Vite build fails the PR, and feature tests that render `@vite` pages need its manifest. The caller is `templates/laravel-app/.github/workflows/ci.yml`, with
  `merge-on-green` and `close-linked-issues` as in every profile; there is no image job.
- The test database matches production's engine and major (`database-image`: `mysql:8.4`,
  `mariadb:11.4`, …): MySQL and MariaDB differ in JSON, collations and DDL. SQLite `:memory:`
  may stay in `phpunit.xml` for quick local runs; the job's environment overrides it in CI.
- Runner images pinned (`ubuntu-24.04`), bumped deliberately on a quiet week. A private repo's check
  and audit jobs may use the self-hosted runner (`docs/core/workflow.md`).

## Rules

- **Migrations are append-only once merged to `main`.** A later schema change is a new migration.
  A migration still on an unmerged branch may be edited (`../decisions.md`).
- **Name composite indexes and foreign keys yourself.** Laravel builds the name from the table and
  every column, which can pass MySQL and MariaDB's 64-character identifier limit. SQLite has no
  limit, so local runs pass and only the CI database fails the migration.
- **Use block `@php … @endphp` in Blade views, not inline `@php(...)`.** When a view mixes the two,
  Blade compiles everything from the inline one to the next `@endphp` as one PHP block, and the
  view fails with parse errors such as "unexpected endif".
- **Livewire actions skip custom route middleware.** `/livewire/update` re-applies only `auth`
  and `can:` from the page's route, so any other middleware the page relies on (2FA enrolment,
  a tenant or consent check) is skipped on actions from a page that is already open. Register it
  with `Livewire::addPersistentMiddleware([...])`, and test an action posted without it. Check
  this in migration Phase 3 for every Livewire app.
- **Mailgun needs its mailer defined.** Laravel's `config/mail.php` skeleton has no `mailgun`
  entry, so `MAIL_MAILER=mailgun` fails with "Mailer [mailgun] is not defined" until
  `'mailgun' => ['transport' => 'mailgun']` is added under `mailers`.
- Policies and validation as in `../core/security.md`: Form Requests or `$request->validate`, and
  a policy or gate for every action, in Livewire component methods too.

## Deploy (RunCloud)

RunCloud pulls a git branch. CI builds the front-end assets and publishes them on a deploy branch
(`deploy-production`, plus `deploy-staging` where there is a staging site); RunCloud never builds.

- **The deploy branch is merged into, never force-pushed:** RunCloud's shallow pull fails on
  rewritten history. If it ever needs a reset, delete it and let the next run recreate it.
- **Merging to `main` is the release.** After `merge-on-green` merges, the dispatched `main` run
  checks, builds and merges into `deploy-production`. `workflow_dispatch` on `main` redeploys. A
  repo that wants a manual production gate records it in its `docs/DECISIONS.md`.
- **Revision check:** the publish job writes the commit into the deploy branch (a `REVISION`
  file), a no-auth route returns `{ ok, revision }` from it (Laravel's `/up` stays as it is), and
  the job waits for the deployed commit, or a later one, to be serving. It fails otherwise:
  RunCloud's own status doesn't say which commit is live. Register the route outside the
  `web` group: `web` starts a session, and with the database session driver every health poll
  writes a `sessions` row. Removing `StartSession` from one web route breaks
  `ShareErrorsFromSession`, so don't. Either put it in `bootstrap/app.php`, where routes
  added in `then:` get no group middleware:

  ```php
  use App\Http\Controllers\HealthController;   // at the top of bootstrap/app.php
  use Illuminate\Support\Facades\Route;

  ->withRouting(
      web: __DIR__.'/../routes/web.php',
      health: '/up',
      // No auth, no session, no database: says which commit this release is.
      then: function (): void {
          Route::get('/api/health', HealthController::class)->name('health');
      },
  )
  ```

  ```php
  // app/Http/Controllers/HealthController.php
  class HealthController extends Controller
  {
      public function __invoke(): JsonResponse
      {
          // REVISION is written by CI on the deploy branch. Missing or empty reports null.
          $revision = trim((string) @file_get_contents(base_path('REVISION')));

          return response()->json([
              'ok' => true,
              'revision' => $revision !== '' ? $revision : null,
          ])->header('Cache-Control', 'no-store');
      }
  }
  ```

  or in `routes/api.php`, if the app registers it, after checking that the `api` group adds
  nothing that touches the database (a `throttle` on a database cache store writes per request).

  **A controller, not a closure.** `route:cache`, which `optimize` runs on deploy, serializes a
  closure handler by reading its source line. With two closures on one line
  (`then: fn () => Route::get(..., fn () => ...)`, this profile's earlier example) it takes the
  outer one, the cached route returns a `Route` object, every request gets a 500 and the
  revision check fails. Tests don't cache routes, so they pass. An app that keeps a closure
  handler keeps it alone on its line and tests that it survives serialization:

  ```php
  it('still answers once routes are cached', function () {
      $route = app('router')->getRoutes()->match(Request::create('/api/health'));
      $action = unserialize(serialize(new SerializableClosure($route->getAction('uses'))))->getClosure();
      expect($action())->toBeInstanceOf(JsonResponse::class);
  });
  ```

- The reusable `runcloud-deploy.yml` does all of this (the template's `deploy` job). Set the
  `APP_HEALTH_URL` variable to that route's public URL, and point RunCloud's Git deployment at
  `deploy-production` with its GitHub webhook on push. RunCloud's deploy script drops any
  `npm` build step: the assets arrive built.
- If the front end imports from `vendor/` (a Filament panel theme, Livewire or Flux CSS), set
  `composer-install: true` on the `deploy` job, or the build can't resolve those imports.
  `vendor/` is installed for the build only and isn't published.
- **Remove `ignore_user_abort`, `set_time_limit`, `fpassthru` and `tmpfile` from the web app's
  PHP `disable_functions`.** RunCloud disables them by default, and Laravel and Livewire call
  them. Without `ignore_user_abort` every `BinaryFileResponse` fails, so PHP-served files 502,
  Livewire's own script among them: Filament and Livewire screens render but nothing on them
  works. Without `fpassthru`, Storage downloads fail. The process functions (`exec`,
  `proc_open` and the rest) stay disabled for the web pool. CLI PHP (queue, cron) has its own,
  empty list.
- **Containerized RunCloud servers:** PHP runs inside the `runcloud_phpXXrc` container, so
  `/RunCloud/Packages/phpXXrc/bin/php` and the `{PHPXX}` replacers fail in deploy hooks there.
  Use plain `php`. On other RunCloud servers keep the replacer, which picks the site's version.
- Migrations and seeders run in RunCloud's deploy script (`php artisan migrate --force`), after
  the pull.
- **Atomic Deployment by default** (`../decisions.md`): each release is built in its own
  directory and `live/` points at it once it's ready, so nothing serves half-updated code.
  The setup that works:
  - `.env` as a **Config Symlink**, never edited through the Laravel Environment editor. Then
    `chmod 600` it: RunCloud creates it 644, in a directory every user on the server can enter.
  - `storage` as a **Directory Symlink** (Link From `app_storage/persistent`), with Laravel's
    `storage/` skeleton (`app/public`, `framework/{cache,sessions,views}`, `logs`) created there
    before the first deploy.
  - `php artisan queue:restart` in the **Activate Latest Release → After** hook, so workers load
    the new release.
  - Supervisor and cron commands point at `live/`, not at a release directory.
  - Switching an app to atomic deployment **changes its Git webhook URL**. The old one answers
    403 "Unable to process request!", so update the GitHub webhook in the same sitting.
