// Dependency-free, fail-open rate limiter.
//
// Uses a per-process in-memory sliding window. On Vercel this is per-lambda
// instance (state resets on cold start and is NOT shared across concurrent
// instances), so it blunts single-source bursts without any external setup. For
// distributed, production-grade limits later, swap the internals of `rateLimit`
// for @upstash/ratelimit — the call signature below is intentionally identical
// so no route handler needs to change.
//
// IMPORTANT: this helper NEVER throws. Any internal error returns `{ ok: true }`
// (fail open) so a limiter bug can never take down a request path.

interface Bucket {
  // Timestamps (ms) of hits still inside the current window.
  hits: number[]
}

const store = new Map<string, Bucket>()

// Opportunistic cleanup so the map can't grow unbounded under many distinct keys.
let lastSweep = 0
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  store.forEach((bucket, key) => {
    bucket.hits = bucket.hits.filter((t: number) => now - t < windowMs)
    if (bucket.hits.length === 0) store.delete(key)
  })
}

export interface RateLimitResult {
  ok: boolean
  /** Seconds the caller should wait before retrying (only when `ok` is false). */
  retryAfter?: number
}

/**
 * Record a hit for `key` and report whether it's within `limit` per `windowMs`.
 * Fails open on any internal error.
 */
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  try {
    const { limit, windowMs } = opts
    const now = Date.now()
    sweep(now, windowMs)

    const bucket = store.get(key) ?? { hits: [] }
    // Drop hits that have aged out of the window.
    bucket.hits = bucket.hits.filter((t) => now - t < windowMs)

    if (bucket.hits.length >= limit) {
      store.set(key, bucket)
      const oldest = bucket.hits[0]
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000))
      return { ok: false, retryAfter }
    }

    bucket.hits.push(now)
    store.set(key, bucket)
    return { ok: true }
  } catch {
    return { ok: true }
  }
}

/**
 * Build a stable rate-limit key from a request + an optional userId. Prefers the
 * Clerk userId; falls back to the client IP from forwarding headers; finally to a
 * shared bucket (still better than nothing). `scope` namespaces different routes.
 */
export function rateLimitKey(req: Request, scope: string, userId?: string | null): string {
  if (userId) return `${scope}:user:${userId}`
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return `${scope}:ip:${ip}`
}
