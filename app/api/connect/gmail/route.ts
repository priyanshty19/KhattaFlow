export const dynamic = 'force-dynamic'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/utils/encrypt'
import { getBaseUrl, getGmailRedirectUri } from '@/lib/utils/base-url'
import { createHmac } from 'crypto'

function getOAuth2Client(req: Request) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGmailRedirectUri(req)
  )
}

// Encode userId into state so callback can recover it without email-matching
function encodeState(userId: string): string {
  const hmac = createHmac('sha256', process.env.OTP_SECRET ?? 'dev-secret')
    .update(userId).digest('hex')
  return Buffer.from(userId).toString('base64url') + '.' + hmac
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appUrl = getBaseUrl(req)

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_not_configured`)
  }

  // ── Try auto-connect via Clerk's existing Google OAuth token ──────────────
  // If user signed in with Google via Clerk, try using that token first.
  // Clerk tokens may not have gmail.readonly scope, so we fall back to
  // a dedicated OAuth flow if the Gmail API call fails.
  console.log('[gmail/connect] step=start userId=', userId)
  try {
    const client = await clerkClient()
    const tokenRes = await client.users.getUserOauthAccessToken(userId, 'oauth_google')
    const accessToken = tokenRes.data?.[0]?.token
    console.log('[gmail/connect] clerk_token=', accessToken ? 'present' : 'missing')

    if (accessToken) {
      const oauth2Client = getOAuth2Client(req)
      oauth2Client.setCredentials({ access_token: accessToken })
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      const profile = await gmail.users.getProfile({ userId: 'me' })
      const gmailEmail = profile.data.emailAddress ?? ''
      console.log('[gmail/connect] clerk_auto_connect gmailEmail=', gmailEmail)

      if (gmailEmail) {
        // Token has gmail.readonly — store and redirect, no extra consent needed
        await prisma.oAuthConnection.upsert({
          where: { userId_provider_providerEmail: { userId, provider: 'gmail', providerEmail: gmailEmail } },
          create: {
            userId,
            provider: 'gmail',
            providerEmail: gmailEmail,
            accessToken: encryptToken(accessToken),
            refreshToken: encryptToken(''),   // Clerk manages refresh internally
            tokenExpiresAt: null,
            scopes: 'https://www.googleapis.com/auth/gmail.readonly',
          },
          update: {
            accessToken: encryptToken(accessToken),
          },
        })
        console.log('[gmail/connect] auto_connect_success stored gmailEmail=', gmailEmail)
        return NextResponse.redirect(`${appUrl}/settings?connected=gmail`)
      }
    }
  } catch (autoErr) {
    // Clerk token missing or lacks gmail.readonly scope → fall through to OAuth
    console.log('[gmail/connect] clerk_auto_connect_failed, falling through:', autoErr instanceof Error ? autoErr.message : String(autoErr))
  }

  // ── Dedicated Gmail OAuth flow (requests gmail.readonly explicitly) ───────
  const state = encodeState(userId)
  const oauth2Client = getOAuth2Client(req)
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state,
  })
  console.log('[gmail/connect] step=oauth_redirect redirectUri=', getGmailRedirectUri(req))
  return NextResponse.redirect(url)
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.oAuthConnection.deleteMany({ where: { userId, provider: 'gmail' } })
  return NextResponse.json({ disconnected: true })
}
