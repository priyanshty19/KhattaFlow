import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit'

afterEach(() => {
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('allows hits up to the limit, then blocks with a Retry-After', () => {
    const key = `test-allow-${Math.random()}`
    const opts = { limit: 3, windowMs: 60_000 }
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(true)
    const blocked = rateLimit(key, opts)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it('allows again after the window elapses', () => {
    vi.useFakeTimers()
    const key = `test-window-${Math.random()}`
    const opts = { limit: 1, windowMs: 1000 }
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(false)
    vi.advanceTimersByTime(1100)
    expect(rateLimit(key, opts).ok).toBe(true)
  })

  it('isolates separate keys', () => {
    const a = `test-iso-a-${Math.random()}`
    const b = `test-iso-b-${Math.random()}`
    const opts = { limit: 1, windowMs: 60_000 }
    expect(rateLimit(a, opts).ok).toBe(true)
    expect(rateLimit(b, opts).ok).toBe(true)
    expect(rateLimit(a, opts).ok).toBe(false)
  })
})

describe('rateLimitKey', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://example.com', { headers })

  it('prefers userId when present', () => {
    expect(rateLimitKey(req({}), 'scope', 'user_123')).toBe('scope:user:user_123')
  })

  it('falls back to the first x-forwarded-for IP', () => {
    expect(rateLimitKey(req({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }), 'scope')).toBe('scope:ip:1.2.3.4')
  })

  it('falls back to "unknown" with no userId or IP headers', () => {
    expect(rateLimitKey(req({}), 'scope')).toBe('scope:ip:unknown')
  })
})
