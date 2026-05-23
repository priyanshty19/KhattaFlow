export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthString, getYear } from '@/lib/utils/date'
import { updateMonthlySummary } from '@/lib/engines/summary-engine'
import { ParsedFinancialEmail, FinancialEmailType } from '@/lib/engines/financial-email-parser'

interface ExecuteItem {
  parsed: ParsedFinancialEmail
  categoryId: string
}

// Map email type → sensible paymentMethod
function paymentMethodFor(type: FinancialEmailType) {
  switch (type) {
    case 'loan_emi':
    case 'insurance_premium':
    case 'mf_sip':
      return 'auto_debit' as const
    case 'upi_transaction':
      return 'upi' as const
    case 'cc_payment':
    case 'cc_statement':
      return 'credit_card' as const
    default:
      return 'bank_transfer' as const
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const items: ExecuteItem[] = body.items ?? []

  if (!items.length) return NextResponse.json({ error: 'items array is required' }, { status: 400 })

  const now = new Date()
  const filename = `financial_fetch_${now.toISOString().slice(0, 7)}`

  const importRecord = await prisma.import.create({
    data: { userId, filename, rowCount: items.length, status: 'pending', errorLog: [] },
  })

  const rows = items.map(({ parsed, categoryId }) => {
    const date = parsed.date ?? now
    return {
      userId,
      categoryId,
      amount: parsed.amount,
      type: parsed.categoryHint === 'investment'
        ? ('investment' as const)
        : parsed.categoryHint === 'income'
          ? ('income' as const)
          : parsed.categoryHint === 'savings'
            ? ('savings' as const)
            : ('expense' as const),
      paymentMethod: paymentMethodFor(parsed.type),
      description: parsed.description,
      date,
      month: getMonthString(date),
      year: getYear(date),
      importId: importRecord.id,
      metadata: {
        source: 'financial_fetch',
        emailType: parsed.type,
        institution: parsed.institution,
        gmailMessageId: parsed.gmailMessageId,
        subject: parsed.subject,
        ...parsed.metadata,
      },
    }
  })

  await prisma.transaction.createMany({ data: rows })

  const affectedMonths = Array.from(new Set(rows.map(r => r.month)))
  await Promise.all(affectedMonths.map(month => updateMonthlySummary(userId, month)))

  await prisma.import.update({ where: { id: importRecord.id }, data: { status: 'success' } })

  return NextResponse.json({ importId: importRecord.id, count: rows.length, status: 'success' })
}
