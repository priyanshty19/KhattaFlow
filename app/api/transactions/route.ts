// app/api/transactions/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTransactionSchema, listTransactionsSchema } from '@/lib/validations/transaction'
import { getMonthString, getYear } from '@/lib/utils/date'
import { updateMonthlySummary } from '@/lib/engines/summary-engine'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = listTransactionsSchema.safeParse(Object.fromEntries(searchParams))

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { month, type, categoryId, paymentMethod, search, limit = 50, cursor } = parsed.data

  const where = {
    userId,
    deletedAt: null,
    ...(month && { month }),
    ...(type && { type: type as any }),
    ...(categoryId && { categoryId }),
    ...(paymentMethod && { paymentMethod: paymentMethod as any }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: { select: { name: true, color: true, icon: true, type: true } } },
      orderBy: { date: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    prisma.transaction.count({ where }),
  ])

  const hasMore = transactions.length > limit
  const items = hasMore ? transactions.slice(0, -1) : transactions
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({ items, total, nextCursor })
}

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createTransactionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { date, ...rest } = parsed.data
  const dateObj = new Date(date)

  const transaction = await prisma.transaction.create({
    data: {
      ...rest,
      userId,
      date: dateObj,
      month: getMonthString(dateObj),
      year: getYear(dateObj),
      type: rest.type as any,
      paymentMethod: rest.paymentMethod as any,
    },
    include: { category: { select: { name: true, color: true, icon: true, type: true } } },
  })

  // Update cached monthly summary
  await updateMonthlySummary(userId, transaction.month)

  return NextResponse.json(transaction, { status: 201 })
}
