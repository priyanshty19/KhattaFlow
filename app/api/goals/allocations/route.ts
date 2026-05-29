export const dynamic = 'force-dynamic'
// app/api/goals/allocations/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser } from '@/lib/utils/ensure-user'
import { serializeAllocation } from '@/lib/utils/serialize-goals'
import { upsertAllocationsSchema } from '@/lib/validations/goal'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const allocations = await prisma.investmentAllocation.findMany({ where: { userId } })
  return NextResponse.json(allocations.map(serializeAllocation))
}

// Full replace of the user's allocation set (idempotent upsert).
export async function PUT(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = upsertAllocationsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  await ensureUser(userId)

  // Keep only the vehicles submitted with a positive monthly amount or corpus.
  const incoming = parsed.data.allocations
    .map((a) => ({ ...a, label: a.label ?? '' }))
    .filter((a) => a.monthlyAmount > 0 || (a.currentValue ?? 0) > 0)

  await prisma.$transaction([
    prisma.investmentAllocation.deleteMany({ where: { userId } }),
    ...(incoming.length
      ? [
          prisma.investmentAllocation.createMany({
            data: incoming.map((a) => ({
              userId,
              vehicle: a.vehicle,
              monthlyAmount: BigInt(a.monthlyAmount),
              currentValue: BigInt(a.currentValue ?? 0),
              label: a.label,
            })),
          }),
        ]
      : []),
  ])

  const allocations = await prisma.investmentAllocation.findMany({ where: { userId } })
  return NextResponse.json(allocations.map(serializeAllocation))
}
