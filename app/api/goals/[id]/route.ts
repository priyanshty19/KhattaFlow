export const dynamic = 'force-dynamic'
// app/api/goals/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serializeGoal } from '@/lib/utils/serialize-goals'
import { updateGoalSchema } from '@/lib/validations/goal'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateGoalSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // ownership guard
  const existing = await prisma.financialGoal.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { targetDate, targetAmount, ...rest } = parsed.data
  const goal = await prisma.financialGoal.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(targetAmount !== undefined && { targetAmount: BigInt(targetAmount) }),
      ...(targetDate && { targetDate: new Date(targetDate) }),
    },
  })
  return NextResponse.json(serializeGoal(goal))
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.financialGoal.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.financialGoal.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
