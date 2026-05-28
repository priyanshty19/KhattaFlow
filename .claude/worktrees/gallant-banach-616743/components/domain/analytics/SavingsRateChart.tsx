'use client'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useAnalyticsTrends } from '@/lib/queries'
import { ChartSkeleton } from '@/components/shared/Skeletons'
import { formatMonthShort } from '@/lib/utils/date'

export function SavingsRateChart({ months = 6 }: { months?: number }) {
  const { data, isLoading } = useAnalyticsTrends(months)

  if (isLoading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"><ChartSkeleton /></div>
  )

  const chartData = (data ?? []).map((d: any) => ({
    month: formatMonthShort(d.month),
    rate: Math.round(d.savingsRate),
  }))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-0.5">Savings Rate</h3>
      <p className="text-xs text-zinc-600 mb-5">% of income saved + invested · target 20%</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, 50]} />
          <Tooltip
            formatter={(v: any) => [`${v}%`, 'Savings rate']}
            contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '12px', color: '#fafafa' }}
          />
          <ReferenceLine y={20} stroke="#10B981" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
            {chartData.map((d: any, i: number) => (
              <Cell key={i} fill={d.rate >= 20 ? '#10B981' : d.rate >= 10 ? '#F59E0B' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
