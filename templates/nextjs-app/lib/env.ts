import { z } from "zod";

// Parsed once, on first use. instrumentation.ts calls env() at boot so a bad
// environment stops the server with a readable message instead of failing later.
const schema = z
  .object({
    DATABASE_URL: z.url(),
    SESSION_SECRET: z
      .string()
      .min(32, "SESSION_SECRET must be at least 32 characters"),
    PUBLIC_BASE_URL: z.url(),
    GIT_REVISION: z.string().default("dev"),
    OIDC_ISSUER: z.url().optional(),
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    OIDC_ONLY: z.stringbool().default(false),
    OIDC_TRUST_EMAIL: z.stringbool().default(false),
  })
  .refine(
    (e) => {
      const set = [
        e.OIDC_ISSUER,
        e.OIDC_CLIENT_ID,
        e.OIDC_CLIENT_SECRET,
      ].filter(Boolean).length;
      return set === 0 || set === 3;
    },
    {
      message:
        "Single sign-on needs OIDC_ISSUER, OIDC_CLIENT_ID and OIDC_CLIENT_SECRET together",
    },
  );

export type Env = z.infer<typeof schema>;

let parsed: Env | undefined;

export function env(): Env {
  if (parsed) return parsed;
  // Compose passes unset optional variables as empty strings; treat them as absent.
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== ""),
  );
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  parsed = result.data;
  return parsed;
}
