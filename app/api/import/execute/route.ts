// app/api/import/execute/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMonthString, getYear } from '@/lib/utils/date'
import { updateMonthlySummary } from '@/lib/engines/summary-engine'

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rows, filename } = body

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Create import record
  const importRecord = await prisma.import.create({
    data: { userId, filename: filename ?? 'import.csv', rowCount: rows.length, status: 'pending' },
  })

  try {
    // Bulk insert transactions
    const data = rows.map((row: any) => {
      const dateObj = new Date(row.date)
      return {
        userId,
        categoryId: row.categoryId,
        amount: row.amount, // already in paise from validation
        type: row.type,
        paymentMethod: row.paymentMethod ?? null,
        description: row.description ?? null,
        notes: row.notes ?? null,
        date: dateObj,
        month: getMonthString(dateObj),
        year: getYear(dateObj),
        importId: importRecord.id,
      }
    })

    await prisma.transaction.createMany({ data })

    // Update summaries for all affected months
    const months = Array.from(new Set(data.map(d => d.month)))
    await Promise.all(months.map(m => updateMonthlySummary(userId, m)))

    await prisma.import.update({
      where: { id: importRecord.id },
      data: { status: 'success' },
    })

    return NextResponse.json({ importId: importRecord.id, count: rows.length, status: 'success' })
  } catch (error) {
    await prisma.import.update({
      where: { id: importRecord.id },
      data: { status: 'failed', errorLog: [String(error)] },
    })
    return NextResponse.json({ error: 'Import failed', details: String(error) }, { status: 500 })
  }
}
