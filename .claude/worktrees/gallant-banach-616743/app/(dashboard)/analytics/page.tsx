// app/(dashboard)/analytics/page.tsx
'use client'
import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { SpendingTrendChart } from '@/components/domain/analytics/SpendingTrendChart'
import { CategoryBreakdownChart } from '@/components/domain/analytics/CategoryBreakdownChart'
import { SavingsRateChart } from '@/components/domain/analytics/SavingsRateChart'
import { InvestmentAllocationChart } from '@/components/domain/analytics/InvestmentAllocationChart'
import { getCurrentMonth } from '@/lib/utils/date'

export default function AnalyticsPage() {
  const [month, setMonth] = useState(getCurrentMonth())

  return (
    <>
      <TopBar title="Analytics" month={month} onMonthChange={setMonth} />
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1400px]">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-zinc-100">Analytics</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Patterns in your spending, visible at a glance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <SpendingTrendChart months={6} />
          </div>
          <div>
            <SavingsRateChart months={6} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <CategoryBreakdownChart month={month} />
          <InvestmentAllocationChart month={month} />
        </div>
      </div>
    </>
  )
}
