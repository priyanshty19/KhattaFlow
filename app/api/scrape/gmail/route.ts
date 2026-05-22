export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { decryptToken, encryptToken } from '@/lib/utils/encrypt'
import { GmailParserEngine } from '@/lib/engines/gmail-parser-engine'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const monthsBack: number = parseInt(body.monthsBack ?? '3', 10)

  const conn = await prisma.oAuthConnection.findFirst({ where: { userId, provider: 'gmail' } })
  if (!conn) {
    return NextResponse.json({ error: 'Gmail not connected. Connect it in Settings.' }, { status: 400 })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: decryptToken(conn.accessToken),
    refresh_token: decryptToken(conn.refreshToken),
    expiry_date: conn.tokenExpiresAt?.getTime(),
  })

  // Auto-refresh if expired
  oauth2Client.on('tokens', async (tokens) => {
    await prisma.oAuthConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encryptToken(tokens.access_token ?? decryptToken(conn.accessToken)),
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    })
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const messages = await GmailParserEngine.searchBankEmails(gmail, monthsBack)
  const { results, skipped } = GmailParserEngine.parseEmailsToParsedSms(messages)

  return NextResponse.json({
    preview: results,
    count: results.length,
    scanned: messages.length,
    skipped,
  })
}
