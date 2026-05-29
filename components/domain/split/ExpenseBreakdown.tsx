'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatINR } from '@/lib/utils/currency'
import { getSplitCategoryMeta } from '@/constants/split-categories'
import type { SplitExpenseDTO } from '@/lib/queries/split'

export function ExpenseBreakdown({ expenses }: { expenses: SplitExpenseDTO[] }) {
  const byCat = new Map<string, number>()
  for (const e of expenses) {
    const key = e.category ?? 'uncategorized'
    byCat.set(key, (byCat.get(key) ?? 0) + e.amount)
  }
  const data = Array.from(byCat.entries())
    .map(([id, amount]) => ({
      id,
      label: getSplitCategoryMeta('business', id)?.label ?? 'Uncategorized',
      color: getSplitCategoryMeta('business', id)?.color ?? '#94A3B8',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-sm text-zinc-500">No expenses to break down yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3">Spend by category</h3>
      <div className="flex items-center gap-4">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="label" innerRadius={36} outerRadius={60} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.id} fill={d.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatINR(v)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.slice(0, 6).map((d) => (
            <div key={d.id} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="text-zinc-400 truncate flex-1">{d.label}</span>
              <span className="text-zinc-300 tabular-nums">{formatINR(d.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
