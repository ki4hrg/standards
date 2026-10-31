# Profile: WordPress plugin

A plugin distributed as a zip and updated from GitHub releases. None of `../core/deploy.md`
applies. `workflow.md`, `security.md` and `agent-docs.md` do.

## Structure

- The plugin slug equals the folder name and the main file name.
- PHP code is namespaced and autoloaded (PSR-4) from `src/`: `final` classes with a static
  `boot()` hooked from the main file. The main file holds the header, constants and the bootstrap,
  nothing else.
- The version lives in three places, kept in step by one bump script: the plugin header
  `Version:`, a `<PREFIX>_VERSION` constant, and `package.json`.
- Blocks: `block.json` (apiVersion 3), dynamic blocks rendering through `render.php` into
  partials a theme can override. JS is built with `@wordpress/scripts`.
- Server endpoints are REST routes with a real `permission_callback`, not admin-ajax.
- Every input is sanitized, every output escaped, every state change checks a nonce and a
  capability.

## Tooling

- Composer for dev tooling only, `composer.lock` committed, `config.platform.php` pinned to the
  oldest PHP the plugin supports (local PHP is newer and would otherwise resolve incompatible
  dev dependencies).
- WPCS 3 plus PHPCompatibilityWP (with `testVersion` set to the supported range), PHPStan level 6
  with `szepeviktor/phpstan-wordpress`, PHPUnit (unit and integration suites), `wp-scripts lint-js`.
- Local development with `@wordpress/env`; `package-lock.json` committed.

## CI

- On every PR: phpcs, phpstan, JS lint and build, and PHPUnit inside wp-env across the oldest and
  newest supported PHP versions. `security.yml` with `package-manager: composer` (plus npm).
- On a `vX.Y.Z` tag: check that the tag matches the header, the constant and `package.json`;
  build with `composer install --no-dev -o` and `npm run build`; package through `.distignore`;
  publish with `gh release create --generate-notes` and a zip named `<slug>.zip` (the name the
  updater expects).

## Updates

The plugin updates itself from GitHub releases of its (possibly private) repo:

- `Update URI` set in the header, so wordpress.org never offers an update for the slug.
- A read-only, fine-grained token for private repos, set by a `wp-config.php` constant (which wins)
  or a write-only settings field. Never displayed back.
- A `<PREFIX>_DISABLE_UPDATES` constant as a kill switch.

## Reference

The two most recent plugins built this way are the reference implementations. Copy their
release workflow, bump script and updater rather than writing new ones.
