'use client'
import { useState } from 'react'
import { Plus, CalendarRange } from 'lucide-react'
import { SplitModal } from './SplitModal'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { toPaise } from '@/lib/utils/currency'
import { useCreateCycle, type CycleDTO } from '@/lib/queries/split'
import { formatDate, todayISO } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

export function BudgetCyclePanel({
  groupId,
  cycles,
  activeCycleId,
  onSelect,
}: {
  groupId: string
  cycles: CycleDTO[]
  activeCycleId: string | null
  onSelect: (id: string) => void
}) {
  const create = useCreateCycle(groupId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [budget, setBudget] = useState('')

  const submit = () => {
    if (!name.trim()) return
    create.mutate(
      { name: name.trim(), startDate, endDate, totalBudget: budget ? toPaise(budget) : 0 },
      {
        onSuccess: () => {
          setOpen(false)
          setName('')
          setBudget('')
        },
      },
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Budget cycles</h3>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New cycle
        </button>
      </div>

      {!cycles.length ? (
        <p className="text-xs text-zinc-500 py-4 text-center">No cycles yet. Create one to plan a budget.</p>
      ) : (
        <div className="space-y-2">
          {cycles.map((c) => {
            const pct = c.totalBudget > 0 ? Math.min(100, Math.round((c.spent / c.totalBudget) * 100)) : 0
            const selected = c.id === activeCycleId
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn('w-full text-left p-3 rounded-xl border transition-colors', selected ? 'border-emerald-500/50 bg-emerald-500/[0.05]' : 'border-zinc-800 hover:border-zinc-700')}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-zinc-100 inline-flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-zinc-500" /> {c.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">{formatDate(c.startDate)} – {formatDate(c.endDate)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Spent <CurrencyDisplay amount={c.spent} size="xs" muted /></span>
                  {c.totalBudget > 0 && <span>of <CurrencyDisplay amount={c.totalBudget} size="xs" muted /></span>}
                </div>
                {c.totalBudget > 0 && (
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <SplitModal open={open} title="New budget cycle" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 2026"
              className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">End</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Planned budget (₹, optional)</label>
            <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="0" className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 tabular-nums" />
          </div>
          <button
            onClick={submit}
            disabled={!name.trim() || create.isPending}
            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold transition-colors"
          >
            {create.isPending ? 'Creating…' : 'Create cycle'}
          </button>
        </div>
      </SplitModal>
    </div>
  )
}
