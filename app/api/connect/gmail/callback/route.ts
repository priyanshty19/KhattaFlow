export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/utils/encrypt'
import { getBaseUrl, getGmailRedirectUri } from '@/lib/utils/base-url'
import { createHmac } from 'crypto'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = getBaseUrl(req)

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed`)
  }

  try {
    console.log('[gmail/callback] step=start state_prefix=', state.slice(0, 20))

    // Decode userId from state: base64url(userId).hmac
    const dotIndex = state.lastIndexOf('.')
    if (dotIndex === -1) {
      console.error('[gmail/callback] no dot in state, old-format state received')
      return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed`)
    }
    const encodedId = state.slice(0, dotIndex)
    const receivedHmac = state.slice(dotIndex + 1)
    const userId = Buffer.from(encodedId, 'base64url').toString('utf8')
    console.log('[gmail/callback] step=decoded userId=', userId)

    // Verify HMAC to prevent CSRF
    const expectedHmac = createHmac('sha256', process.env.OTP_SECRET ?? 'dev-secret')
      .update(userId)
      .digest('hex')

    if (receivedHmac !== expectedHmac) {
      console.error('[gmail/callback] HMAC mismatch received=', receivedHmac.slice(0, 8), 'expected=', expectedHmac.slice(0, 8))
      return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed`)
    }

    const user = await prisma.user.findFirst({ where: { id: userId } })
    if (!user) {
      console.error('[gmail/callback] user not found for userId=', userId)
      return NextResponse.redirect(`${appUrl}/settings?error=gmail_user_not_found`)
    }
    console.log('[gmail/callback] step=user_found email=', user.email)

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getGmailRedirectUri(req)
    )

    console.log('[gmail/callback] step=exchange_code')
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    console.log('[gmail/callback] step=tokens_received has_refresh=', !!tokens.refresh_token)

    // Get Gmail address
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const gmailEmail = profile.data.emailAddress ?? ''
    console.log('[gmail/callback] step=profile gmailEmail=', gmailEmail)

    // Look up any existing connection to preserve refresh_token if Google didn't return a new one
    // (Google only sends refresh_token on first authorization or after revoking access)
    const existing = await prisma.oAuthConnection.findFirst({
      where: { userId: user.id, provider: 'gmail' },
    })

    const refreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : existing?.refreshToken ?? encryptToken('')

    await prisma.oAuthConnection.upsert({
      where: {
        userId_provider_providerEmail: {
          userId: user.id,
          provider: 'gmail',
          providerEmail: gmailEmail,
        },
      },
      create: {
        userId: user.id,
        provider: 'gmail',
        providerEmail: gmailEmail,
        accessToken: encryptToken(tokens.access_token ?? ''),
        refreshToken,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: (tokens.scope ?? '').replace(/\s+/g, ' ').trim(),
      },
      update: {
        accessToken: encryptToken(tokens.access_token ?? ''),
        refreshToken,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    })

    console.log('[gmail/callback] step=upsert_done, redirecting to settings')
    return NextResponse.redirect(`${appUrl}/settings?connected=gmail`)

  } catch (err) {
    console.error('[gmail/callback] error:', err)
    const detail = encodeURIComponent(
      err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300)
    )
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed&detail=${detail}`)
  }
}
