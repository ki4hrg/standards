export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { env } = await import('./lib/env');
  env();
  // Start background jobs here. Each takes a Postgres advisory lock so two
  // instances never run the same job at once.
}
