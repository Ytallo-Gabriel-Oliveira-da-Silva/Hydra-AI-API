import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitInput = {
  key: string;
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const globalState = globalThis as unknown as {
  __hydraRateLimitBuckets?: Map<string, Bucket>;
};

const buckets = globalState.__hydraRateLimitBuckets || new Map<string, Bucket>();
globalState.__hydraRateLimitBuckets = buckets;

export function getRequestIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || req.headers.get("cf-connecting-ip")?.trim()
    || "unknown";
}

function gcExpired(now: number) {
  if (buckets.size < 5000) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function evaluateRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  gcExpired(now);

  const current = buckets.get(input.key);
  if (!current || current.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      allowed: true,
      remaining: input.max - 1,
      retryAfterMs: 0,
    };
  }

  if (current.count >= input.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, current.resetAt - now),
    };
  }

  current.count += 1;
  buckets.set(input.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, input.max - current.count),
    retryAfterMs: 0,
  };
}
