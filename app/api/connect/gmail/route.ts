export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'
    return NextResponse.redirect(`${appUrl}/settings?error=gmail_not_configured`)
  }

  const { createHmac } = await import('crypto')
  const state = createHmac('sha256', process.env.OTP_SECRET ?? 'dev-secret')
    .update(userId)
    .digest('hex')

  const oauth2Client = getOAuth2Client()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state,
  })

  return NextResponse.redirect(url)
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.oAuthConnection.deleteMany({ where: { userId, provider: 'gmail' } })
  return NextResponse.json({ disconnected: true })
}
