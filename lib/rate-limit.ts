type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

declare global {
  var __yoyakuRateLimitStore: RateLimitStore | undefined;
}

const store = globalThis.__yoyakuRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__yoyakuRateLimitStore = store;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000)
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function clearExpiredRateLimitEntries(now = Date.now()) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}
