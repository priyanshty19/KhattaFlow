export const dynamic = 'force-dynamic'
// app/api/networth/route.ts
// Net Worth proxy (v1): no linked bank/asset accounts yet, so we approximate net
// worth as the user's *invested corpus* (sum of InvestmentAllocation.currentValue)
// plus their *cumulative net savings* (running sum of MonthlySummary.netBalance).
// Also returns a cumulative running series for a sparkline.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [summaries, allocations] = await Promise.all([
    prisma.monthlySummary.findMany({
      where: { userId },
      orderBy: { month: 'asc' },
      select: { month: true, netBalance: true },
    }),
    prisma.investmentAllocation.findMany({
      where: { userId },
      select: { currentValue: true },
    }),
  ])

  const investedCorpus = allocations.reduce((sum, a) => sum + Number(a.currentValue), 0)

  // Build the cumulative running series; investedCorpus is a current snapshot so we
  // add it as a flat base under the savings curve.
  let running = 0
  const series = summaries.map((s) => {
    running += Number(s.netBalance)
    return { month: s.month, value: running + investedCorpus }
  })

  const cumulativeSavings = running
  const netWorth = cumulativeSavings + investedCorpus

  return NextResponse.json({
    netWorth,
    cumulativeSavings,
    investedCorpus,
    monthsTracked: summaries.length,
    series,
  })
}
