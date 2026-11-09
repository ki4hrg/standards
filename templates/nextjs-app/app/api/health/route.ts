// Liveness and the running commit, for the container healthcheck and for checking
// what is deployed. No auth and no database call: the database has its own check.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    revision: process.env.GIT_REVISION ?? "unknown",
  });
}
