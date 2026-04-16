// Rate limiting.
//
// Uses Upstash Redis REST when UPSTASH_REDIS_REST_URL / _TOKEN are set.
// Without those env vars we fall back to an in-memory bucket per process —
// fine locally, useless across Vercel functions but safe (never blocks
// legitimate traffic because each Lambda gets its own state).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }
  if (current.count >= limit) {
    return { success: false, remaining: 0, reset: current.resetAt };
  }
  current.count += 1;
  return { success: true, remaining: limit - current.count, reset: current.resetAt };
}

const LIMITS = {
  login: { limit: 10, window: "10 m" as const, windowMs: 10 * 60 * 1000 },
  signup: { limit: 5, window: "1 h" as const, windowMs: 60 * 60 * 1000 },
  forgotPassword: { limit: 5, window: "1 h" as const, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitKind = keyof typeof LIMITS;

const upstashLimiters: Partial<Record<RateLimitKind, Ratelimit>> = {};

export async function checkRateLimit(
  kind: RateLimitKind,
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const redis = getRedis();
  const spec = LIMITS[kind];

  if (redis) {
    let limiter = upstashLimiters[kind];
    if (!limiter) {
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(spec.limit, spec.window),
        prefix: `luxlane:rl:${kind}`,
        analytics: false,
      });
      upstashLimiters[kind] = limiter;
    }
    const res = await limiter.limit(identifier);
    return { success: res.success, remaining: res.remaining, reset: res.reset };
  }

  return inMemoryCheck(`${kind}:${identifier}`, spec.limit, spec.windowMs);
}

/** Helper: pull a stable identifier out of a Request (IP → fallback to path). */
export function ipFromRequest(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown"
  );
}
