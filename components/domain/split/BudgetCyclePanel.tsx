'use client'
import { useMemo, useState } from 'react'
import { Plus, CalendarRange } from 'lucide-react'
import { SplitModal } from './SplitModal'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { toPaise } from '@/lib/utils/currency'
import { useCreateCycle, type CycleDTO } from '@/lib/queries/split'
import { formatDate, todayISO } from '@/lib/utils/date'
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_ORDER } from '@/constants/split-categories'
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
  const [status, setStatus] = useState<'draft' | 'active'>('active')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [buffer, setBuffer] = useState('')
  const [notes, setNotes] = useState('')
  // Per-category planned amounts keyed by category id (₹ strings).
  const [allocs, setAllocs] = useState<Record<string, string>>({})

  const setAlloc = (id: string, val: string) => setAllocs((a) => ({ ...a, [id]: val }))

  // Auto-summed totals (in ₹ for display).
  const { allocTotalRupees, totalRupees } = useMemo(() => {
    const allocTotal = BUSINESS_CATEGORY_ORDER.reduce((s, id) => s + (parseFloat(allocs[id]) || 0), 0)
    const buf = parseFloat(buffer) || 0
    return { allocTotalRupees: allocTotal, totalRupees: allocTotal + buf }
  }, [allocs, buffer])

  const reset = () => {
    setName('')
    setStatus('active')
    setStartDate(todayISO())
    setEndDate(todayISO())
    setBuffer('')
    setNotes('')
    setAllocs({})
  }

  const submit = () => {
    if (!name.trim()) return
    const allocations = BUSINESS_CATEGORY_ORDER
      .map((id) => ({ category: id, amount: allocs[id] ? toPaise(allocs[id]) : 0 }))
      .filter((a) => a.amount > 0)
    const bufferPaise = buffer ? toPaise(buffer) : 0
    const totalBudget = allocations.reduce((s, a) => s + a.amount, 0) + bufferPaise
    create.mutate(
      {
        name: name.trim(),
        startDate,
        endDate,
        totalBudget,
        bufferAmount: bufferPaise,
        notes: notes.trim() || undefined,
        allocations,
        status,
      },
      {
        onSuccess: () => {
          setOpen(false)
          reset()
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
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{c.status}</span>
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
                {c.bufferAmount > 0 && (
                  <p className="text-[10px] text-zinc-600 mt-1.5">Buffer <CurrencyDisplay amount={c.bufferAmount} size="xs" muted /></p>
                )}
              </button>
            )
          })}
        </div>
      )}

      <SplitModal open={open} title="New budget cycle" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jun – Aug 2026"
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'active')}
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Buffer reserve (₹)</label>
              <input value={buffer} onChange={(e) => setBuffer(e.target.value)} inputMode="decimal" placeholder="0" className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 tabular-nums" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Total budget — auto</label>
              <div className="w-full h-11 px-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center text-sm font-semibold text-emerald-400 tabular-nums">
                ₹{totalRupees.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Per-category allocations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-zinc-400">Category allocations</label>
              <span className="text-xs text-emerald-400 tabular-nums">₹{allocTotalRupees.toLocaleString('en-IN')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {BUSINESS_CATEGORY_ORDER.map((id) => {
                const meta = BUSINESS_CATEGORIES[id]
                return (
                  <div key={id} className="space-y-1">
                    <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </label>
                    <input
                      value={allocs[id] ?? ''}
                      onChange={(e) => setAlloc(id, e.target.value)}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full h-9 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm tabular-nums focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cycle goals, priorities…"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
            />
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
