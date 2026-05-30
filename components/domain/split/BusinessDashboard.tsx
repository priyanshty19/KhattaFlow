'use client'
import { useEffect, useState } from 'react'
import { RunwayWidget } from './RunwayWidget'
import { BudgetCyclePanel } from './BudgetCyclePanel'
import { ContributionTracker } from './ContributionTracker'
import { ExpenseBreakdown } from './ExpenseBreakdown'
import { InventoryPanel } from './InventoryPanel'
import { useCycles, type SplitGroupDetail } from '@/lib/queries/split'

/** Business-mode group dashboard: metrics, budget cycles, contributions, breakdown. */
export function BusinessDashboard({ group }: { group: SplitGroupDetail }) {
  const { data } = useCycles(group.id)
  const cycles = data?.cycles ?? []
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null)

  useEffect(() => {
    if (!activeCycleId && cycles.length) setActiveCycleId(cycles[0].id)
  }, [activeCycleId, cycles])

  const activeCycle = cycles.find((c) => c.id === activeCycleId) ?? null

  // Cross-cycle rollups for the runway widget.
  const totalSpent = cycles.reduce((s, c) => s + c.spent, 0)
  const totalContributions = cycles.reduce((s, c) => s + c.contributed, 0)
  const fundsAvailable = totalContributions - totalSpent
  // Burn = active cycle spend (single-cycle proxy for monthly burn).
  const burnRate = activeCycle?.spent ?? 0

  return (
    <div className="space-y-4">
      <RunwayWidget fundsAvailable={fundsAvailable} burnRate={burnRate} totalContributions={totalContributions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BudgetCyclePanel groupId={group.id} cycles={cycles} activeCycleId={activeCycleId} onSelect={setActiveCycleId} />
        {activeCycle ? (
          <ContributionTracker groupId={group.id} cycle={activeCycle} members={group.members} />
        ) : (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="text-sm text-zinc-500">Select or create a cycle to track contributions.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpenseBreakdown expenses={group.expenses} />
        <InventoryPanel groupId={group.id} />
      </div>
    </div>
  )
}
