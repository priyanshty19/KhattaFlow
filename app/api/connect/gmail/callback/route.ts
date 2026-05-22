export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/utils/encrypt'
import { createHmac } from 'crypto'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed`)
  }

  // Exchange code for tokens
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  // Get Gmail address
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const gmailEmail = profile.data.emailAddress ?? ''

  // Recover userId from state (HMAC of userId)
  // We look up the user whose HMAC(userId) matches the state
  // Since we don't store the raw userId in state, find by email match in OAuthConnections or
  // by re-deriving: fetch all user IDs and check. For a single-user app this is trivial.
  // Better: store a short-lived nonce. For now, find user by Gmail email match in users table.
  const user = await prisma.user.findFirst({ where: { email: gmailEmail } })

  if (!user) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_user_not_found`)
  }

  // Verify state matches HMAC(userId) to prevent CSRF
  const expectedState = createHmac('sha256', process.env.OTP_SECRET ?? 'dev-secret')
    .update(user.id)
    .digest('hex')

  if (state !== expectedState) {
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_auth_failed`)
  }

  await prisma.oAuthConnection.upsert({
    where: { userId_provider_providerEmail: { userId: user.id, provider: 'gmail', providerEmail: gmailEmail } },
    create: {
      userId: user.id,
      provider: 'gmail',
      providerEmail: gmailEmail,
      accessToken: encryptToken(tokens.access_token ?? ''),
      refreshToken: encryptToken(tokens.refresh_token ?? ''),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: (tokens.scope ?? '').replace(/\s+/g, ' ').trim(),
    },
    update: {
      accessToken: encryptToken(tokens.access_token ?? ''),
      refreshToken: encryptToken(tokens.refresh_token ?? ''),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  })

  return NextResponse.redirect(`${appUrl}/settings/import?connected=gmail`)
}
