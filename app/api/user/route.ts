export const dynamic = 'force-dynamic'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  return NextResponse.json(user)
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerkUser = await currentUser()
  const body = await req.json().catch(() => ({}))

  const user = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
      name: clerkUser?.fullName ?? body.name ?? null,
      monthlySalary: body.monthlySalary ?? null,
      savingsGoalPct: body.savingsGoalPct ?? 0.20,
    },
    update: {
      ...(body.name && { name: body.name }),
      ...(body.monthlySalary && { monthlySalary: body.monthlySalary }),
      ...(body.savingsGoalPct && { savingsGoalPct: body.savingsGoalPct }),
    },
  })

  return NextResponse.json(user, { status: 201 })
}
