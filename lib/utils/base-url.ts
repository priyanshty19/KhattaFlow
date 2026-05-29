/**
 * Centralized base-URL / OAuth redirect-URI derivation.
 *
 * Instead of reading an environment-specific URL (GOOGLE_REDIRECT_URI /
 * NEXT_PUBLIC_APP_URL) — which historically leaked localhost values into
 * production and caused redirect_uri_mismatch — we derive the origin from the
 * incoming request's forwarded headers. This is automatically correct on
 * localhost, Vercel preview deployments, and production with zero config.
 */

/**
 * Derive the public origin (scheme + host) of the current request.
 * Falls back to NEXT_PUBLIC_APP_URL, then localhost, for non-request contexts.
 */
export function getBaseUrl(req?: Request): string {
  if (req) {
    const headers = req.headers
    const proto =
      headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'http'
    const host =
      headers.get('x-forwarded-host')?.split(',')[0]?.trim() ??
      headers.get('host')?.split(',')[0]?.trim()
    if (host) {
      return `${proto}://${host}`
    }
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

/**
 * The Gmail OAuth callback URL for the current request's environment.
 * Must match an Authorized redirect URI registered on the Google OAuth client.
 */
export function getGmailRedirectUri(req?: Request): string {
  return `${getBaseUrl(req)}/api/connect/gmail/callback`
}
