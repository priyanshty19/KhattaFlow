// app/api/transactions/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateTransactionSchema } from '@/lib/validations/transaction'
import { updateMonthlySummary } from '@/lib/engines/summary-engine'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transaction = await prisma.transaction.findFirst({
    where: { id: params.id, userId, deletedAt: null },
    include: { category: { select: { name: true, color: true, icon: true, type: true } } },
  })
  if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(transaction)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.transaction.findFirst({
    where: { id: params.id, userId, deletedAt: null },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = updateTransactionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // If date is changing, recompute month/year and convert to full ISO DateTime
  const extra: Record<string, unknown> = {}
  if (parsed.data.date) {
    const d = new Date(`${parsed.data.date}T00:00:00.000Z`)
    extra.date = d           // Prisma DateTime needs a Date object / full ISO string
    extra.month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    extra.year = d.getUTCFullYear()
  }

  // Remove the plain string date so it doesn't conflict with the converted Date above
  const { date: _date, ...restData } = parsed.data

  try {
    const updated = await prisma.transaction.update({
      where: { id: params.id },
      data: { ...restData, ...extra } as any,
      include: { category: { select: { name: true, color: true, icon: true, type: true } } },
    })

    // Update both old and new month summaries if the month changed
    await updateMonthlySummary(userId, existing.month)
    if (extra.month && extra.month !== existing.month) {
      await updateMonthlySummary(userId, extra.month as string)
    }

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[PATCH /api/transactions/:id]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.transaction.findFirst({
    where: { id: params.id, userId, deletedAt: null },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.transaction.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  })

  await updateMonthlySummary(userId, existing.month)

  return NextResponse.json({ success: true })
}
