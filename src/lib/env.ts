// Runtime env access — lazy.
//
// We deliberately do NOT validate at module load. Next.js's build step
// ("Collecting page data") imports every route module to analyse it, and
// Vercel's runtime env vars are only injected at request time in some
// phases. Eager validation would fail the build even when the env is
// correctly configured in production.
//
// Instead we expose getters that read (and validate once) on first access
// in the request path. Fail loud, fail late.

function readRequired(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

const cache = new Map<string, string>();

function cachedRequired(name: string): string {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  const v = readRequired(name);
  cache.set(name, v);
  return v;
}

export const env = {
  get DATABASE_URL(): string {
    return cachedRequired("DATABASE_URL");
  },
  get AUTH_SECRET(): string {
    return cachedRequired("AUTH_SECRET");
  },
  get APP_URL(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get NODE_ENV(): "development" | "production" | "test" {
    return (process.env.NODE_ENV ?? "development") as
      | "development"
      | "production"
      | "test";
  },
};
