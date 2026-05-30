'use client'
import { useState } from 'react'
import { LayoutList, CalendarRange } from 'lucide-react'
import { BudgetTabs } from '@/components/domain/budgets/BudgetTabs'
import { BudgetPlanner } from '@/components/domain/budgets/BudgetPlanner'
import { TopBar } from '@/components/layout/TopBar'
import { MoneyTabs } from '@/components/layout/MoneyTabs'
import { getCurrentMonth } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

type View = 'monthly' | 'planner'

export default function BudgetsPage() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [view, setView] = useState<View>('monthly')

  const toggle = (
    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-lg p-0.5">
      <button
        onClick={() => setView('monthly')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
          view === 'monthly'
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-300'
        )}
      >
        <LayoutList className="w-3.5 h-3.5" />
        Monthly
      </button>
      <button
        onClick={() => setView('planner')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
          view === 'planner'
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-300'
        )}
      >
        <CalendarRange className="w-3.5 h-3.5" />
        Planner
      </button>
    </div>
  )

  return (
    <>
      <TopBar
        title="Budget"
        month={view === 'monthly' ? month : undefined}
        onMonthChange={view === 'monthly' ? setMonth : undefined}
        actions={toggle}
      />
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1200px] mx-auto w-full">
        <div className="md:hidden mb-4">
          <MoneyTabs />
        </div>
        <div className="mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-zinc-100">Budget</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            {view === 'monthly' ? 'Set limits. Track health. Stay disciplined.' : 'Plan your budgets across the next 6 months.'}
          </p>
        </div>
        {view === 'monthly' ? (
          <BudgetTabs month={month} />
        ) : (
          <BudgetPlanner startMonth={getCurrentMonth()} />
        )}
      </div>
    </>
  )
}
