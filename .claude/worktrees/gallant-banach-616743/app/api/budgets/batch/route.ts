export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { upsertBudgetSchema } from '@/lib/validations/budget'
import { z } from 'zod'

const batchSchema = z.object({
  entries: z.array(upsertBudgetSchema).min(1),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { entries } = parsed.data

  await prisma.$transaction(
    entries.map(entry => {
      const key = { userId, categoryId: entry.categoryId, month: entry.month }
      if (entry.amount === 0) {
        return prisma.budget.deleteMany({ where: key })
      }
      return prisma.budget.upsert({
        where: { userId_categoryId_month: key },
        create: { ...entry, userId },
        update: { amount: entry.amount },
      })
    })
  )

  return NextResponse.json({ ok: true, count: entries.length })
}
