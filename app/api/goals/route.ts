export const dynamic = 'force-dynamic'
// app/api/goals/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/utils/ensure-user'
import { serializeGoal } from '@/lib/utils/serialize-goals'
import { createGoalSchema } from '@/lib/validations/goal'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const goals = await prisma.financialGoal.findMany({
    where: { userId },
    orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }],
  })
  return NextResponse.json(goals.map(serializeGoal))
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createGoalSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureUser(userId)

  const goal = await prisma.financialGoal.create({
    data: {
      userId,
      name: parsed.data.name,
      targetAmount: BigInt(parsed.data.targetAmount),
      targetDate: new Date(parsed.data.targetDate),
      priority: parsed.data.priority ?? 0,
    },
  })
  return NextResponse.json(serializeGoal(goal), { status: 201 })
}
