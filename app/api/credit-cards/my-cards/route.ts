export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toPaise } from '@/lib/utils/currency'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cards = await prisma.userCreditCard.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ cards })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cardName, bank, last4, creditLimit, statementDay, dueDay } = await req.json() as {
    cardName: string
    bank: string
    last4?: string
    creditLimit?: number  // ₹ — we store as paise
    statementDay?: number
    dueDay?: number
  }

  if (!cardName || !bank) {
    return NextResponse.json({ error: 'cardName and bank are required' }, { status: 400 })
  }

  const card = await prisma.userCreditCard.create({
    data: {
      userId,
      cardName,
      bank,
      last4: last4 ?? null,
      creditLimit: creditLimit ? toPaise(creditLimit) : null,
      statementDay: statementDay ?? null,
      dueDay: dueDay ?? null,
    },
  })

  return NextResponse.json({ card }, { status: 201 })
}
