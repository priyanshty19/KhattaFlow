export const dynamic = 'force-dynamic'
// app/api/analytics/trends/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AnalyticsEngine } from '@/lib/engines/analytics-engine'

export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const months = parseInt(searchParams.get('months') ?? '6', 10)

  const summaries = await prisma.monthlySummary.findMany({
    where: { userId },
    orderBy: { month: 'desc' },
    take: months,
  })

  const trend = AnalyticsEngine.computeSpendingTrend(summaries.reverse() as any, months)
  return NextResponse.json(trend)
}
