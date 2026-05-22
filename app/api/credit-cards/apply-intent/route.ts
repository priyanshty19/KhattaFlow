export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface IntentBody {
  cardId: string
  cardName: string
  bank: string
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as IntentBody
  if (!body.cardId || !body.cardName) {
    return NextResponse.json({ error: 'cardId and cardName are required' }, { status: 400 })
  }

  const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  await prisma.cardApplyIntent.create({
    data: {
      userId,
      cardId:   body.cardId,
      cardName: body.cardName,
      bank:     body.bank ?? '',
      month,
    },
  })

  return NextResponse.json({ ok: true })
}
