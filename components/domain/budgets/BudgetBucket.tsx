'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MoreHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { toRupees } from '@/lib/utils/currency'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { CategoryTransactions } from './CategoryTransactions'
import { useUIStore } from '@/stores/ui.store'

const TAB_LABELS: Record<string, string> = {
  expense: 'Debt',
  savings: 'Savings',
  investment: 'Investments',
  income: 'Incoming',
}

interface BudgetBucketProps {
  name: string | null
  categories: any[]
  budgetAmounts: Record<string, number>
  spending: Record<string, number>
  month: string
  onSave: (categoryId: string, rupeesStr: string) => void
  onMoveToGroup: (categoryId: string, group: string | null) => void
  onMoveToTab: (categoryId: string, newType: string) => void
  onRemoveBudget: (categoryId: string) => void
  currentTab: string
  allBuckets: string[]
  isEmpty?: boolean
}

interface MenuPos { top: number; left: number }

function ContextMenu({
  catId, pos, name, allBuckets, currentTab, hasBudget,
  onMoveToGroup, onMoveToTab, onRemoveBudget, onClose,
}: {
  catId: string
  pos: MenuPos
  name: string | null
  allBuckets: string[]
  currentTab: string
  hasBudget: boolean
  onMoveToGroup: (id: string, group: string | null) => void
  onMoveToTab: (id: string, type: string) => void
  onRemoveBudget: (id: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const otherBuckets = allBuckets.filter(b => b !== name)

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
      className="z-[9999] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl min-w-44 max-h-64 overflow-y-auto py-1 text-xs"
    >
      {hasBudget && (
        <>
          <button
            className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-zinc-800 hover:text-red-300"
            onClick={() => { onRemoveBudget(catId); onClose() }}
          >
            Clear budget
          </button>
          <div className="my-1 border-t border-zinc-800" />
        </>
      )}

      {otherBuckets.length > 0 && (
        <>
          <p className="px-3 py-1.5 text-zinc-500 font-medium">Move to bucket</p>
          {otherBuckets.map(b => (
            <button
              key={b}
              className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
              onClick={() => { onMoveToGroup(catId, b); onClose() }}
            >
              {b}
            </button>
          ))}
        </>
      )}

      {name !== null && (
        <button
          className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-zinc-800 hover:text-red-300"
          onClick={() => { onMoveToGroup(catId, null); onClose() }}
        >
          Remove from bucket
        </button>
      )}

      <div className="my-1 border-t border-zinc-800" />
      <p className="px-3 py-1.5 text-zinc-500 font-medium">Move to tab</p>
      {Object.entries(TAB_LABELS)
        .filter(([id]) => id !== currentTab)
        .map(([id, label]) => (
          <button
            key={id}
            className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
            onClick={() => { onMoveToTab(catId, id); onClose() }}
          >
            {`→ ${label}`}
          </button>
        ))}
    </div>,
    document.body
  )
}

export function BudgetBucket({
  name, categories, budgetAmounts, spending, month,
  onSave, onMoveToGroup, onMoveToTab, onRemoveBudget,
  currentTab, allBuckets, isEmpty = false,
}: BudgetBucketProps) {
  const [open, setOpen] = useState(true)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [contextMenu, setContextMenu] = useState<{ id: string; pos: MenuPos } | null>(null)
  const openQuickAdd = useUIStore(s => s.openQuickAdd)

  const totalBudgeted = categories.reduce((s, c) => s + (budgetAmounts[c.id] ?? 0), 0)
  const totalSpent = categories.reduce((s, c) => s + (spending[c.id] ?? 0), 0)
  const pct = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0
  const statusColor = pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400'
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'

  const getInput = (catId: string) =>
    inputValues[catId] !== undefined
      ? inputValues[catId]
      : budgetAmounts[catId] != null
      ? String(toRupees(budgetAmounts[catId]))
      : ''

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, catId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const menuHeight = 260
    const spaceBelow = window.innerHeight - rect.bottom
    const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 4
    const left = Math.min(rect.right - 176, window.innerWidth - 184)
    setContextMenu({ id: catId, pos: { top, left } })
  }

  return (
    <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl">
      {/* Bucket header */}
      <div className="flex items-center">
        <button
          className="flex-1 flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/50 transition-colors rounded-2xl"
          onClick={() => setOpen(v => !v)}
        >
          <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform shrink-0', !open && '-rotate-90')} />
          <span className="text-sm font-medium text-zinc-300 flex-1 text-left">
            {name ?? 'Ungrouped'}
          </span>
          {totalBudgeted > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
              </div>
              <span className={cn('text-xs font-medium tabular-nums w-8 text-right', statusColor)}>
                {pct.toFixed(0)}%
              </span>
              <span className="text-xs text-zinc-500 tabular-nums">
                ₹{toRupees(totalBudgeted).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </button>
        {/* Bucket-level add transaction */}
        <button
          onClick={() => openQuickAdd({ type: currentTab, categoryId: categories[0]?.id })}
          className="px-4 py-4 text-zinc-600 hover:text-emerald-400 transition-colors shrink-0"
          title="Add transaction to this bucket"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Categories */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
              {isEmpty && (
                <div className="px-5 py-4 text-xs text-zinc-500 italic">
                  Empty bucket — use the <span className="text-zinc-400 not-italic font-medium">⋯</span> menu on any category below to move it here.
                </div>
              )}

              {categories.map((cat) => {
                const spent = spending[cat.id] ?? 0
                const budgeted = budgetAmounts[cat.id] ?? 0
                const catPct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0
                const catBarColor = catPct >= 100 ? 'bg-red-500' : catPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                const catStatusColor = catPct >= 100 ? 'text-red-400' : catPct >= 80 ? 'text-amber-400' : 'text-emerald-400'
                const inputVal = getInput(cat.id)

                return (
                  <div key={cat.id}>
                    {/* Category row */}
                    <div className="px-5 py-3.5 flex items-center gap-4">
                      <div className="flex items-center gap-2.5 w-36 shrink-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm text-zinc-300 truncate">{cat.name}</span>
                      </div>

                      <div className="relative shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={inputVal}
                          onChange={e => setInputValues(v => ({ ...v, [cat.id]: e.target.value }))}
                          onBlur={e => {
                            if (e.target.value !== String(toRupees(budgetAmounts[cat.id] ?? 0))) {
                              onSave(cat.id, e.target.value)
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onSave(cat.id, inputVal);
                              (e.target as HTMLInputElement).blur()
                            }
                          }}
                          className="w-28 pl-6 pr-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 tabular-nums"
                        />
                      </div>

                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        {budgeted > 0 ? (
                          <>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${catPct}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={cn('h-full rounded-full', catBarColor)}
                              />
                            </div>
                            <span className={cn('text-xs tabular-nums w-10 text-right shrink-0', catStatusColor)}>
                              {catPct.toFixed(0)}%
                            </span>
                            <div className="text-xs text-zinc-500 tabular-nums shrink-0">
                              <CurrencyDisplay amount={spent} size="sm" muted /> / <CurrencyDisplay amount={budgeted} size="sm" muted />
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-600">No budget set</span>
                        )}
                      </div>

                      <button
                        onClick={e => openMenu(e, cat.id)}
                        className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors shrink-0"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Inline transactions for this category */}
                    <CategoryTransactions
                      categoryId={cat.id}
                      categoryType={cat.type}
                      isUngrouped={name === null}
                      month={month}
                    />
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal context menu */}
      {contextMenu && (
        <ContextMenu
          catId={contextMenu.id}
          pos={contextMenu.pos}
          name={name}
          allBuckets={allBuckets}
          currentTab={currentTab}
          hasBudget={(budgetAmounts[contextMenu.id] ?? 0) > 0}
          onMoveToGroup={onMoveToGroup}
          onMoveToTab={onMoveToTab}
          onRemoveBudget={(id) => {
            onRemoveBudget(id)
            setInputValues(v => ({ ...v, [id]: '' }))
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
