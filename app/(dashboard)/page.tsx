// app/(dashboard)/page.tsx
'use client'
import { Suspense, useState } from 'react'
import { getCurrentMonth } from '@/lib/utils/date'
import { TopBar } from '@/components/layout/TopBar'
import { DashboardNetWorth } from '@/components/domain/dashboard/DashboardNetWorth'
import { DashboardPulse } from '@/components/domain/dashboard/DashboardPulse'
import { DashboardGoalBand } from '@/components/domain/dashboard/DashboardGoalBand'
import { DashboardSplitSummary } from '@/components/domain/dashboard/DashboardSplitSummary'
import { DashboardBudgetZone } from '@/components/domain/dashboard/DashboardBudgetZone'
import { DashboardInsightZone } from '@/components/domain/dashboard/DashboardInsightZone'
import { CreditCardWidget } from '@/components/domain/credit-cards/CreditCardWidget'
import { StatCardSkeleton } from '@/components/shared/Skeletons'

export default function DashboardPage() {
  const [month, setMonth] = useState(getCurrentMonth())

  return (
    <>
      <TopBar title="Overview" month={month} onMonthChange={setMonth} />
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1400px] mx-auto w-full">
        {/* Net Worth hero — the headline differentiator, above the fold */}
        <Suspense fallback={<div className="skeleton h-44 rounded-2xl" />}>
          <DashboardNetWorth />
        </Suspense>

        {/* This month's pulse */}
        <Suspense fallback={<StatCardSkeleton />}>
          <DashboardPulse month={month} />
        </Suspense>

        {/* CredWise — best-card recommender, between the month summary and goals */}
        <CreditCardWidget />

        {/* Forward-looking band: goals + shared money */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Suspense fallback={<div className="skeleton h-56 rounded-2xl" />}>
            <DashboardGoalBand />
          </Suspense>
          <Suspense fallback={<div className="skeleton h-56 rounded-2xl" />}>
            <DashboardSplitSummary />
          </Suspense>
        </div>

        {/* Operational detail: budget health + insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
              <DashboardBudgetZone month={month} />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<div className="skeleton h-64 rounded-xl" />}>
              <DashboardInsightZone month={month} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
