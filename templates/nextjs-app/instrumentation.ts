export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { env } = await import('./lib/env');
    env();
  } catch (err) {
    // Next only logs a throw from register() ("Failed to prepare server") and keeps
    // the process alive without serving, so the container looks up until the
    // healthcheck gives out. Exit instead, with the reason in the log.
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  // Start background jobs here. Each takes a Postgres advisory lock so two
  // instances never run the same job at once.
}
