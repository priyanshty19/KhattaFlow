export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { auth } from '@clerk/nextjs/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { decryptToken, encryptToken } from '@/lib/utils/encrypt'
import { FinancialEmailParser, ParsedFinancialEmail } from '@/lib/engines/financial-email-parser'
import { suggestCategorySlug } from '@/lib/engines/merchant-category-rules'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { gmail_v1 } from 'googleapis'

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// ── Gemini fallback parser ─────────────────────────────────────────────────────

async function parseWithGemini(
  subject: string,
  body: string
): Promise<Partial<ParsedFinancialEmail> | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a financial transaction extractor for Indian banks and financial institutions.
Given the email subject and body below, extract the transaction details.

Email Subject: ${subject}
Email Body (first 1500 chars): ${body.slice(0, 1500)}

Return a JSON object with these fields (and ONLY these fields):
- type: one of [bank_debit, bank_credit, salary_credit, cc_statement, cc_payment, mf_purchase, mf_sip, mf_redemption, dividend, stock_trade, loan_emi, insurance_premium, fd_interest, fd_maturity, upi_transaction]
- amount: transaction amount in rupees as an integer (0 if unknown)
- direction: "debit" or "credit"
- description: a concise 1-line description of the transaction
- institution: the bank or institution name

Return ONLY valid JSON. If this is not a financial email or you cannot determine the amount, return the JSON: {"type":null}.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(jsonText)

    if (!parsed.type || parsed.type === null) return null

    return {
      type: parsed.type,
      amount: parsed.amount ? Math.round(parsed.amount * 100) : 0, // paise
      direction: parsed.direction ?? 'debit',
      description: parsed.description ?? subject,
      institution: parsed.institution ?? '',
    }
  } catch (err) {
    console.error('[financial-fetch] gemini_fallback error:', err)
    return null
  }
}

// ── Route handler (SSE streaming) ─────────────────────────────────────────────

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const monthsBack: number = Math.min(parseInt(body.monthsBack ?? '3', 10), 12)
  const forceFullScan: boolean = body.forceFullScan === true

  const conn = await prisma.oAuthConnection.findFirst({ where: { userId, provider: 'gmail' } })
  if (!conn) {
    return new Response(JSON.stringify({ error: 'Gmail not connected.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Set up OAuth client. No redirect URI needed: this client only refreshes
  // existing tokens, it never runs a redirect-based authorization flow.
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({
    access_token: decryptToken(conn.accessToken),
    refresh_token: decryptToken(conn.refreshToken),
    expiry_date: conn.tokenExpiresAt?.getTime(),
  })

  // Persist refreshed tokens automatically
  let updatedAccessToken: string | null = null
  oauth2Client.on('tokens', async (tokens) => {
    updatedAccessToken = tokens.access_token ?? null
    await prisma.oAuthConnection.update({
      where: { id: conn.id },
      data: {
        accessToken: encryptToken(tokens.access_token ?? decryptToken(conn.accessToken)),
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    })
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // ── Build readable SSE stream ────────────────────────────────────────────────
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(sseEvent(data)))

      try {
        // ── Always do a full scan for user-triggered requests ───────────────────
        // Incremental (History API) is reserved for future background jobs only.
        // User selects monthsBack explicitly — always honour it.
        console.log('[financial-fetch] step=full_scan monthsBack=', monthsBack)
        const rawMessages: gmail_v1.Schema$Message[] = await FinancialEmailParser.searchEmails(gmail, monthsBack)
        const usedIncremental = false

        const total = rawMessages.length
        send({ type: 'progress', scanned: 0, total, found: 0, phase: 'fetching' })
        console.log(`[financial-fetch] step=parse total=${total} incremental=${usedIncremental}`)

        // ── Save new historyId ───────────────────────────────────────────────────
        try {
          const profile = await gmail.users.getProfile({ userId: 'me' })
          if (profile.data.historyId) {
            await prisma.oAuthConnection.update({
              where: { id: conn.id },
              data: { gmailHistoryId: profile.data.historyId },
            })
          }
        } catch { /* non-critical */ }

        // ── Parse in batches, streaming progress ────────────────────────────────
        const BATCH = 10
        const allResults: ParsedFinancialEmail[] = []
        let scanned = 0
        let regexSkipped = 0

        for (let i = 0; i < rawMessages.length; i += BATCH) {
          const batch = rawMessages.slice(i, i + BATCH)
          const { results, skipped } = FinancialEmailParser.parseMessages(batch)
          regexSkipped += skipped
          allResults.push(...results)
          scanned += batch.length
          send({ type: 'progress', scanned, total, found: allResults.length, phase: 'parsing' })
        }

        // ── Gemini fallback for zero-amount results ──────────────────────────────
        const needsGemini = allResults.filter(r => r.amount === 0 && r.type !== 'cc_statement')
        if (needsGemini.length > 0) {
          console.log(`[financial-fetch] gemini_fallback count=${needsGemini.length}`)
          send({ type: 'progress', scanned, total, found: allResults.length, phase: 'ai_parsing' })
          for (const item of needsGemini) {
            const geminiResult = await parseWithGemini(item.subject, item.rawText)
            if (geminiResult && geminiResult.amount && geminiResult.amount > 0) {
              item.amount = geminiResult.amount
              item.direction = geminiResult.direction ?? item.direction
              item.description = geminiResult.description ?? item.description
              item.institution = geminiResult.institution ?? item.institution
              console.log(`[financial-fetch] gemini_fallback resolved msgId=${item.gmailMessageId} amount=${item.amount}`)
            }
          }
        }

        // ── Filter out zero-amount non-CC items after Gemini ────────────────────
        const finalResults = allResults.filter(r => r.amount > 0 || r.type === 'cc_statement')

        // ── Enrich with merchant category suggestions ────────────────────────────
        const enriched = finalResults.map(r => ({
          ...r,
          suggestedCategorySlug: suggestCategorySlug(r.description, r.institution),
        }))

        // ── Group by type for UI ─────────────────────────────────────────────────
        const grouped = enriched.reduce<Record<string, typeof enriched>>(
          (acc, item) => {
            const key = item.type
            if (!acc[key]) acc[key] = []
            acc[key].push(item)
            return acc
          },
          {}
        )

        send({
          type: 'done',
          results: enriched,
          grouped,
          count: enriched.length,
          scanned: total,
          regexSkipped,
          usedIncremental,
        })

        console.log(`[financial-fetch] step=complete found=${enriched.length} scanned=${total} regexSkipped=${regexSkipped}`)
      } catch (err) {
        console.error('[financial-fetch] stream error:', err)
        send({ type: 'error', message: err instanceof Error ? err.message : 'Scan failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
