'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAnalyticsTrends } from '@/lib/queries'
import { ChartSkeleton } from '@/components/shared/Skeletons'
import { formatMonthShort } from '@/lib/utils/date'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="text-zinc-100 font-semibold tabular-nums">
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  )
}

interface SpendingTrendChartProps { months?: number }

export function SpendingTrendChart({ months = 6 }: SpendingTrendChartProps) {
  const { data, isLoading } = useAnalyticsTrends(months)

  if (isLoading) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <ChartSkeleton />
    </div>
  )

  const chartData = (data ?? []).map((d: any) => ({
    ...d,
    month: formatMonthShort(d.month),
  }))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-zinc-200 mb-0.5">Income vs Expenses</h3>
      <p className="text-xs text-zinc-600 mb-5">Last {months} months cashflow</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="income"   name="Income"   stroke="#10B981" fill="url(#gIncome)"  strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10B981' }} />
          <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#EF4444" fill="url(#gExpense)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#EF4444' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
