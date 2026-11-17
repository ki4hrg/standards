export async function register() {
  // Node-only code lives in instrumentation-node.ts, imported only inside this check:
  // Next builds this file for the Edge runtime too, and warns about Node APIs
  // (process.exit) it can see there even behind an early return.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
