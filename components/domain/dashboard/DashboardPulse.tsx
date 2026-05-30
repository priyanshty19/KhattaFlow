'use client'
import { Wallet, TrendingUp, PiggyBank, Scale } from 'lucide-react'
import { StatCard } from './StatCard'
import { useAnalyticsSummary } from '@/lib/queries'
import { AnalyticsEngine } from '@/lib/engines/analytics-engine'
import { TransactionEngine } from '@/lib/engines/transaction-engine'
import { StatCardSkeleton } from '@/components/shared/Skeletons'

export function DashboardPulse({ month }: { month: string }) {
  const { data, isLoading } = useAnalyticsSummary(month)

  if (isLoading) return <StatCardSkeleton />

  const summary = data?.summary ?? { totalIncome: 0, totalExpenses: 0, totalSavings: 0, totalInvestments: 0 }
  const netBalance = TransactionEngine.computeNetBalance(summary)
  const savingsRate = AnalyticsEngine.computeSavingsRate(summary)

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold text-zinc-100">Monthly Expense Dashboard</h2>
        <p className="text-sm text-zinc-400 mt-0.5">
          {savingsRate > 0
            ? <>Your savings rate is up <span className="text-emerald-400 font-semibold">{savingsRate.toFixed(1)}%</span> from last month.</>
            : 'Track your money, grow your wealth.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <StatCard label="Income"           amount={summary.totalIncome}                           subtext="Total inflow"                                                                                                     icon={Wallet}    index={0} />
        <StatCard label="Spent"            amount={summary.totalExpenses}                          subtext={summary.totalIncome > 0 ? `${((summary.totalExpenses / summary.totalIncome) * 100).toFixed(0)}% of income` : 'Total outflow'} icon={TrendingUp} index={1} />
        <StatCard label="Saved & Invested" amount={summary.totalSavings + summary.totalInvestments} subtext={savingsRate > 0 ? `${savingsRate.toFixed(1)}% rate` : 'Put away this month'}                                   icon={PiggyBank}  index={2} highlight={savingsRate >= 15} />
        <StatCard label="Net Balance"      amount={netBalance}                                     subtext="Remaining this month"                                                                                             icon={Scale}      index={3} highlight={netBalance > 0} warning={netBalance < -5000} />
      </div>
    </div>
  )
}
