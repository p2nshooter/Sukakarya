import { getKv } from "@/lib/env";

export interface RateLimitOptions {
  /** Stable identifier for the caller + action, e.g. `complaint:<village>:<ip>`. */
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Fixed-window rate limiter backed by KV.
 *
 * Counts requests inside a window bucket derived from the clock, so no cleanup
 * job is needed - each bucket expires on its own. Two callers hitting the same
 * key concurrently can both read the same count, so the effective limit may
 * overshoot slightly under load. That is an acceptable trade for public forms,
 * where the goal is stopping floods rather than exact accounting.
 *
 * Fails open: if KV is unavailable the request is allowed, because losing the
 * limiter must not take the public forms down with it.
 */
export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<boolean> {
  const { key, limit, windowSeconds } = options;

  try {
    const kv = getKv();
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const storageKey = `rl:${key}:${bucket}`;

    const current = Number((await kv.get(storageKey)) ?? "0");
    if (current >= limit) return false;

    await kv.put(storageKey, String(current + 1), {
      // Keep the bucket a little past its window so a late request in the same
      // window still sees the count.
      expirationTtl: Math.max(windowSeconds * 2, 60),
    });
    return true;
  } catch (error) {
    console.error("rate limit check failed, allowing request", error);
    return true;
  }
}
