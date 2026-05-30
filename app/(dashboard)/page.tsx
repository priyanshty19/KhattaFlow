// app/(dashboard)/page.tsx
'use client'
import { Suspense, useState } from 'react'
import { getCurrentMonth } from '@/lib/utils/date'
import { TopBar } from '@/components/layout/TopBar'
import { DashboardPulse } from '@/components/domain/dashboard/DashboardPulse'
import { DashboardBudgetZone } from '@/components/domain/dashboard/DashboardBudgetZone'
import { DashboardInsightZone } from '@/components/domain/dashboard/DashboardInsightZone'
import { StatCardSkeleton } from '@/components/shared/Skeletons'

export default function DashboardPage() {
  const [month, setMonth] = useState(getCurrentMonth())

  return (
    <>
      <TopBar title="Overview" month={month} onMonthChange={setMonth} />
      <div className="flex flex-col gap-4 md:gap-8 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1400px] mx-auto w-full">
        <Suspense fallback={<StatCardSkeleton />}>
          <DashboardPulse month={month} />
        </Suspense>

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
