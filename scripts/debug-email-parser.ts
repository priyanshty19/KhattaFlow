/**
 * Debug script — fetch ALL emails, show every bank_debit + problematic parses
 * Run: npx tsx scripts/debug-email-parser.ts
 */

import { google } from 'googleapis'
import { prisma } from '../lib/prisma'
import { decryptToken } from '../lib/utils/encrypt'
import { FinancialEmailParser, buildFinancialQuery } from '../lib/engines/financial-email-parser'
import { gmail_v1 } from 'googleapis'

function decodeBody(message: gmail_v1.Schema$Message): string {
  const parts = message.payload?.parts ?? [message.payload ?? {}]
  let text = ''
  function walk(parts: gmail_v1.Schema$MessagePart[]) {
    for (const part of parts) {
      if (part.parts) { walk(part.parts); continue }
      const mime = part.mimeType ?? ''
      if (mime === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64url').toString('utf8') + '\n'
      } else if (mime === 'text/html' && part.body?.data && !text) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf8')
        text += html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ') + '\n'
      }
    }
  }
  walk(parts)
  return text.trim()
}
function getHeader(msg: gmail_v1.Schema$Message, name: string) {
  return msg.payload?.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
}

async function main() {
  const conn = await prisma.oAuthConnection.findFirst({ where: { provider: 'gmail' }, orderBy: { createdAt: 'desc' } })
  if (!conn) { console.error('No Gmail connection'); process.exit(1) }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI
  )
  oauth2Client.setCredentials({
    access_token: decryptToken(conn.accessToken),
    refresh_token: decryptToken(conn.refreshToken),
    expiry_date: conn.tokenExpiresAt?.getTime(),
  })
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Fetch ALL 102 emails
  const query = buildFinancialQuery(3)
  const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 500 })
  const messages = listRes.data.messages ?? []
  console.log(`\n📧 Total matched: ${messages.length}. Fetching all...\n`)

  const full: gmail_v1.Schema$Message[] = []
  for (let i = 0; i < messages.length; i += 10) {
    const batch = messages.slice(i, i + 10)
    const fetched = await Promise.all(batch.map(m =>
      gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' }).then(r => r.data)
    ))
    full.push(...fetched)
    process.stdout.write(`\r  Fetched ${full.length}/${messages.length}`)
  }
  console.log('\n')

  const { results, skipped } = FinancialEmailParser.parseMessages(full)

  // ── Show ALL bank_debit results (these are the suspicious ones) ───────────────
  console.log('═══════════════════════════════════')
  console.log('  BANK DEBIT results (false positives likely here)')
  console.log('═══════════════════════════════════\n')
  const debits = results.filter(r => r.type === 'bank_debit')
  for (const r of debits) {
    const msg = full.find(m => m.id === r.gmailMessageId)!
    const body = decodeBody(msg)
    console.log(`From:    ${getHeader(msg, 'from')}`)
    console.log(`Subject: ${getHeader(msg, 'subject')}`)
    console.log(`Amount:  ₹${(r.amount/100).toLocaleString('en-IN')}  (raw: ${r.amount})`)
    console.log(`Date:    ${r.date?.toLocaleDateString('en-IN') ?? 'null'}`)
    console.log(`Desc:    ${r.description}`)
    console.log(`Body[0:400]: ${body.slice(0,400).replace(/\s+/g,' ')}`)
    console.log('───────────────────────────────────\n')
  }

  // ── NaN amounts ────────────────────────────────────────────────────────────────
  const nanItems = results.filter(r => isNaN(r.amount))
  if (nanItems.length) {
    console.log('⚠️  NaN AMOUNTS:')
    for (const r of nanItems) {
      const msg = full.find(m => m.id === r.gmailMessageId)!
      console.log(`  Subject: ${getHeader(msg, 'subject')}`)
      console.log(`  Type: ${r.type}  Raw amount: ${r.amount}`)
    }
    console.log()
  }

  // ── Full summary ───────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════')
  console.log(`  FULL SUMMARY (${full.length} emails)`)
  console.log('═══════════════════════════════════')
  const byType = results.reduce<Record<string,number>>((a,r) => { a[r.type]=(a[r.type]??0)+1; return a },{})
  for (const [t,n] of Object.entries(byType).sort((a,b) => b[1]-a[1]))
    console.log(`  ${t.padEnd(24)} ${n}`)
  console.log(`  ${'(skipped)'.padEnd(24)} ${skipped}`)
  console.log()

  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
