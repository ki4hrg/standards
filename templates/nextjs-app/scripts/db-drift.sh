#!/bin/sh
# Fails when lib/db/schema.ts has changes with no migration (docs/profiles/nextjs-app.md).
# It generates a throwaway "drift-check" migration and looks for it, then puts the
# migrations directory back as committed, pass or fail, so nothing is left behind.
set -eu
dir=lib/db/migrations

# Restoring afterwards is only safe when there was nothing uncommitted to lose.
if [ -n "$(git status --porcelain -- "$dir")" ]; then
  echo "db:drift: $dir has uncommitted changes; commit or remove them first." >&2
  exit 1
fi

restore() { git checkout -q -- "$dir" && git clean -fdq -- "$dir"; }
trap restore EXIT

drizzle-kit generate --name=drift-check
if [ -n "$(git status --porcelain -- "$dir")" ]; then
  git status --short -- "$dir" >&2
  echo "db:drift: schema.ts has changes with no migration. Run pnpm db:generate --name <what>." >&2
  exit 1
fi
