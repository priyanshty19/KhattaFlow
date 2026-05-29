export const dynamic = 'force-dynamic'
// app/api/goals/plan/route.ts
// Loads goals + allocations + user's investment style, runs the goals engine,
// and returns per-goal projections, projection series, and optimizer suggestions.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  evaluateGoal,
  optimizeAllocations,
  projectionSeries,
  monthlyTotal,
  existingCorpus,
  blendedReturn,
  monthsUntil,
  type Allocation,
} from '@/lib/engines/goals-engine'
import { DEFAULT_STYLE } from '@/constants/investment-returns'
import type { InvestmentStyle } from '@/constants/categories'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, goals, allocationRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { investmentStyle: true } }),
    prisma.financialGoal.findMany({ where: { userId, status: 'active' }, orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }] }),
    prisma.investmentAllocation.findMany({ where: { userId } }),
  ])

  const style = ((user?.investmentStyle as InvestmentStyle) || DEFAULT_STYLE)
  const allocations: Allocation[] = allocationRows.map((a) => ({
    vehicle: a.vehicle as Allocation['vehicle'],
    monthlyAmount: Number(a.monthlyAmount),
    currentValue: Number(a.currentValue),
  }))

  const evaluations = goals.map((g) => {
    const ev = evaluateGoal(
      { id: g.id, name: g.name, targetAmount: Number(g.targetAmount), targetDate: g.targetDate },
      allocations,
    )
    return {
      ...ev,
      targetDate: g.targetDate,
      series: projectionSeries(allocations, monthsUntil(g.targetDate)),
    }
  })

  const suggestions = optimizeAllocations(allocations, style)

  return NextResponse.json({
    style,
    summary: {
      monthlyInvesting: monthlyTotal(allocations),
      existingCorpus: existingCorpus(allocations),
      blendedReturn: blendedReturn(allocations),
      goalsTotal: goals.length,
      onTrack: evaluations.filter((e) => e.status !== 'behind').length,
    },
    goals: evaluations,
    suggestions,
  })
}
