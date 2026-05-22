export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ParsedSms } from '@/lib/engines/sms-parser-engine'
import { getMonthString, getYear } from '@/lib/utils/date'
import { updateMonthlySummary } from '@/lib/engines/summary-engine'

interface GmailExecuteItem {
  parsed: ParsedSms & { gmailMessageId?: string }
  categoryId: string
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const items: GmailExecuteItem[] = body.items ?? []

  if (!items.length) {
    return NextResponse.json({ error: 'items array is required' }, { status: 400 })
  }

  const now = new Date()
  const filename = `gmail_scrape_${now.toISOString().slice(0, 7)}`

  const importRecord = await prisma.import.create({
    data: { userId, filename, rowCount: items.length, status: 'pending', errorLog: [] },
  })

  const rows = items.map(({ parsed, categoryId }) => {
    const date = parsed.date ?? now
    return {
      userId,
      categoryId,
      amount: parsed.amount,
      type: parsed.type === 'debit' ? ('expense' as const) : ('income' as const),
      paymentMethod: 'bank_transfer' as const,
      description: `${parsed.bankName} ${parsed.type}${parsed.accountLast4 ? ` ···${parsed.accountLast4}` : ''}`,
      date,
      month: getMonthString(date),
      year: getYear(date),
      importId: importRecord.id,
      metadata: {
        source: 'gmail',
        bankName: parsed.bankName,
        accountLast4: parsed.accountLast4,
        referenceNumber: parsed.referenceNumber,
        gmailMessageId: (parsed as ParsedSms & { gmailMessageId?: string }).gmailMessageId ?? null,
      },
    }
  })

  await prisma.transaction.createMany({ data: rows })

  const affectedMonths = Array.from(new Set(rows.map(r => r.month)))
  await Promise.all(affectedMonths.map(month => updateMonthlySummary(userId, month)))

  await prisma.import.update({ where: { id: importRecord.id }, data: { status: 'success' } })

  return NextResponse.json({ importId: importRecord.id, count: rows.length, status: 'success' })
}
