export const dynamic = 'force-dynamic'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress

  const [userRecord, totalCategories, nonDeletedCategories, categories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.category.count({ where: { userId } }),
    prisma.category.count({ where: { userId, deletedAt: null } }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, slug: true, deletedAt: true, group: true },
      orderBy: { type: 'asc' },
    }),
  ])

  // Simulate the auto-seed decision
  const wouldAutoSeed = nonDeletedCategories === 0

  return NextResponse.json({
    userId,
    email,
    userRecord: userRecord
      ? { id: userRecord.id, email: userRecord.email, investmentStyle: (userRecord as any).investmentStyle, savingsGoalPct: userRecord.savingsGoalPct }
      : null,
    counts: {
      total: totalCategories,
      nonDeleted: nonDeletedCategories,
      wouldAutoSeed,
    },
    categories,
  })
}
