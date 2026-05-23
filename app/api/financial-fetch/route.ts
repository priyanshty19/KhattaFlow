export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { decryptToken, encryptToken } from '@/lib/utils/encrypt'
import { FinancialEmailParser } from '@/lib/engines/financial-email-parser'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const monthsBack: number = Math.min(parseInt(body.monthsBack ?? '3', 10), 12)

  const conn = await prisma.oAuthConnection.findFirst({ where: { userId, provider: 'gmail' } })
  if (!conn) {
    return NextResponse.json(
      { error: 'Gmail not connected. Connect it in Settings → Import.' },
      { status: 400 }
    )
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

  const messages = await FinancialEmailParser.searchEmails(gmail, monthsBack)
  const { results, skipped, scanned } = FinancialEmailParser.parseMessages(messages)

  // Group by type for the UI
  const grouped = results.reduce<Record<string, typeof results>>(
    (acc, item) => {
      const key = item.type
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    },
    {}
  )

  return NextResponse.json({
    results,
    grouped,
    count: results.length,
    scanned,
    skipped,
  })
}
