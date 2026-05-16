'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useAnalyticsSummary } from '@/lib/queries'
import { ChartSkeleton } from '@/components/shared/Skeletons'
import { EmptyState } from '@/components/shared/EmptyState'
import { PieChart as PieIcon } from 'lucide-react'
import { formatINR } from '@/lib/utils/currency'

export function CategoryBreakdownChart({ month }: { month: string }) {
  const { data, isLoading } = useAnalyticsSummary(month)

  if (isLoading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><ChartSkeleton /></div>
  )

  const groups = (data?.categoryGroups ?? []).filter((g: any) => g.type === 'expense')

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-0.5">Expense Breakdown</h3>
      <p className="text-xs text-zinc-600 mb-4">Where your money went this month</p>

      {groups.length === 0 ? (
        <EmptyState icon={PieIcon} title="No expense data" description="Add some expense transactions to see breakdown." />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={groups} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="total">
                {groups.map((g: any, i: number) => (
                  <Cell key={g.categoryId} fill={g.categoryColor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [formatINR(value), '']}
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px', color: '#fafafa' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
            {groups.slice(0, 8).map((g: any) => (
              <div key={g.categoryId} className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.categoryColor }} />
                <span className="text-zinc-500">{g.categoryName}</span>
                <span className="text-zinc-400 tabular-nums font-medium">{formatINR(g.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
