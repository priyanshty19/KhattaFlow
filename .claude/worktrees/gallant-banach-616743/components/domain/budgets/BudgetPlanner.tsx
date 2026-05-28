'use client'
import { useState, useMemo, useCallback } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, MoveRight, Save } from 'lucide-react'
import { useCategories, useBatchUpsertBudgets } from '@/lib/queries/index'
import { toPaise, toRupees } from '@/lib/utils/currency'
import { getNextNMonths, getPreviousMonth, getNextMonth, formatMonthShort, getCurrentMonth } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

const COL_COUNT = 6

interface BudgetEntry {
  categoryId: string
  month: string
  amount: number // paise
}

interface Category {
  id: string
  name: string
  type: string
  color: string
}

const TYPE_ORDER = ['expense', 'savings', 'investment', 'debt']
const TYPE_LABEL: Record<string, string> = {
  expense: 'Expenses',
  savings: 'Savings',
  investment: 'Investments',
  debt: 'Debt',
}

export function BudgetPlanner({ startMonth }: { startMonth: string }) {
  const [rangeStart, setRangeStart] = useState(startMonth)
  const months = useMemo(() => getNextNMonths(rangeStart, COL_COUNT), [rangeStart])
  const monthsKey = months.join(',')

  // User overrides only — keys that the user has typed into
  const [userEdits, setUserEdits] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())

  const { data: categories = [], isLoading: catsLoading } = useCategories()

  const budgetQueries = useQueries({
    queries: months.map(month => ({
      queryKey: ['budgets', month],
      queryFn: async (): Promise<BudgetEntry[]> => {
        const res = await fetch(`/api/budgets?month=${month}`)
        if (!res.ok) throw new Error('Failed')
        return res.json()
      },
      staleTime: 1000 * 60 * 10,
    })),
  })

  // Derive server values purely from fetched data — no side effects needed
  const serverValues = useMemo(() => {
    const result: Record<string, string> = {}
    budgetQueries.forEach((q, i) => {
      if (!q.data) return
      const month = months[i]
      for (const entry of q.data as BudgetEntry[]) {
        const key = `${entry.categoryId}__${month}`
        result[key] = entry.amount > 0 ? String(toRupees(entry.amount)) : ''
      }
    })
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetQueries.map(q => q.dataUpdatedAt).join(','), monthsKey])

  // What to show in each cell: user edit takes priority over server value
  const cellValue = useCallback(
    (key: string) => (dirty.has(key) ? (userEdits[key] ?? '') : (serverValues[key] ?? '')),
    [dirty, userEdits, serverValues]
  )

  const handleChange = useCallback((catId: string, month: string, val: string) => {
    const key = `${catId}__${month}`
    setUserEdits(prev => ({ ...prev, [key]: val }))
    setDirty(prev => new Set(prev).add(key))
  }, [])

  const handleFillRight = useCallback((catId: string) => {
    const firstKey = `${catId}__${months[0]}`
    const value = dirty.has(firstKey) ? (userEdits[firstKey] ?? '') : (serverValues[firstKey] ?? '')
    const edits: Record<string, string> = {}
    const newDirty = new Set(dirty)
    months.forEach(m => {
      const k = `${catId}__${m}`
      edits[k] = value
      newDirty.add(k)
    })
    setUserEdits(prev => ({ ...prev, ...edits }))
    setDirty(newDirty)
  }, [months, dirty, userEdits, serverValues])

  const { mutate: batchSave, isPending: saving } = useBatchUpsertBudgets()

  const handleSaveAll = useCallback(() => {
    const entries: Array<{ categoryId: string; month: string; amount: number }> = []
    dirty.forEach(key => {
      const [categoryId, month] = key.split('__')
      const val = userEdits[key] ?? ''
      const rupees = parseFloat(val) || 0
      entries.push({ categoryId, month, amount: toPaise(String(rupees)) })
    })
    if (entries.length === 0) return
    batchSave(entries, {
      onSuccess: () => {
        setDirty(new Set())
        setUserEdits({})
      },
    })
  }, [dirty, userEdits, batchSave])

  const grouped = useMemo(() => {
    const byType: Record<string, Category[]> = {}
    for (const cat of categories as Category[]) {
      if (!byType[cat.type]) byType[cat.type] = []
      byType[cat.type].push(cat)
    }
    return TYPE_ORDER.filter(t => byType[t]?.length).map(t => ({
      type: t,
      label: TYPE_LABEL[t],
      cats: byType[t],
    }))
  }, [categories])

  const currentMonth = getCurrentMonth()

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRangeStart(getPreviousMonth(rangeStart))}
            disabled={rangeStart <= currentMonth}
            className={cn(
              'p-1.5 rounded-full transition-colors',
              rangeStart <= currentMonth
                ? 'text-zinc-700 cursor-not-allowed'
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-400 tabular-nums">
            {formatMonthShort(months[0])} – {formatMonthShort(months[COL_COUNT - 1])}
          </span>
          <button
            onClick={() => setRangeStart(getNextMonth(rangeStart))}
            className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving || dirty.size === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all',
            dirty.size > 0
              ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 active:scale-95'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : `Save All${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-zinc-700/40">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-700/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 w-[160px] sticky left-0 bg-zinc-900 z-10">
                Category
              </th>
              <th className="px-2 py-3 w-8" />
              {months.map(m => (
                <th key={m} className="px-3 py-3 text-xs font-semibold text-zinc-400 text-right min-w-[100px]">
                  {formatMonthShort(m)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catsLoading ? (
              <tr>
                <td colSpan={COL_COUNT + 2} className="px-4 py-8 text-center text-sm text-zinc-600">
                  Loading categories…
                </td>
              </tr>
            ) : grouped.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT + 2} className="px-4 py-8 text-center text-sm text-zinc-600">
                  No categories found. Add categories in Settings first.
                </td>
              </tr>
            ) : (
              grouped.map(({ type, label, cats }) => (
                <>
                  <tr key={`type-${type}`} className="bg-zinc-900/60 border-t border-zinc-700/40">
                    <td colSpan={COL_COUNT + 2} className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
                      {label}
                    </td>
                  </tr>
                  {cats.map(cat => (
                    <tr key={cat.id} className="border-t border-zinc-800/60 hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-4 py-2 sticky left-0 bg-zinc-950 group-hover:bg-zinc-900/40 z-10">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs text-zinc-300 truncate max-w-[120px]">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-1 py-2">
                        <button
                          title="Copy first month value across all months"
                          onClick={() => handleFillRight(cat.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-zinc-600 hover:text-emerald-400 hover:bg-zinc-800"
                        >
                          <MoveRight className="w-3 h-3" />
                        </button>
                      </td>
                      {months.map(m => {
                        const key = `${cat.id}__${m}`
                        const isDirty = dirty.has(key)
                        const val = cellValue(key)
                        return (
                          <td key={m} className="px-2 py-1.5 text-right">
                            <input
                              type="number"
                              min={0}
                              placeholder="—"
                              value={val}
                              onChange={e => handleChange(cat.id, m, e.target.value)}
                              className={cn(
                                'w-full text-right text-xs px-2 py-1.5 rounded-md bg-zinc-900 border transition-colors tabular-nums outline-none',
                                isDirty
                                  ? 'border-emerald-500/60 text-emerald-300 focus:border-emerald-400'
                                  : 'border-zinc-700/40 text-zinc-300 focus:border-zinc-500'
                              )}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {dirty.size > 0 && (
        <p className="text-xs text-zinc-600">
          {dirty.size} cell{dirty.size > 1 ? 's' : ''} modified — click "Save All" to persist.
        </p>
      )}
    </div>
  )
}
