'use client'
import { useState } from 'react'
import { BudgetTabs } from '@/components/domain/budgets/BudgetTabs'
import { TopBar } from '@/components/layout/TopBar'
import { getCurrentMonth } from '@/lib/utils/date'

export default function BudgetsPage() {
  const [month, setMonth] = useState(getCurrentMonth())

  return (
    <>
      <TopBar title="Budget" month={month} onMonthChange={setMonth} />
      <div className="px-8 py-6 max-w-[1200px]">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-100">Budget</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Set limits. Track health. Stay disciplined.</p>
        </div>
        <BudgetTabs month={month} />
      </div>
    </>
  )
}
