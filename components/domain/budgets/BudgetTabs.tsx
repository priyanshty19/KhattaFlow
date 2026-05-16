'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCategories, useBudgets, useUpsertBudget, useUpdateCategoryGroup, useUpdateCategory, useBudgetStatus } from '@/lib/queries'
import { toast } from 'sonner'
import { BudgetBucket } from './BudgetBucket'
import { toPaise, toRupees } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'
import { Plus } from 'lucide-react'

const TABS = [
  { id: 'expense',    label: 'Debt',        color: 'text-red-400',     activeBg: 'bg-red-500/10 border-red-500/30' },
  { id: 'savings',    label: 'Savings',     color: 'text-purple-400',  activeBg: 'bg-purple-500/10 border-purple-500/30' },
  { id: 'investment', label: 'Investments', color: 'text-blue-400',    activeBg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'income',     label: 'Incoming',    color: 'text-emerald-400', activeBg: 'bg-emerald-500/10 border-emerald-500/30' },
]

export function BudgetTabs({ month }: { month: string }) {
  const [activeTab, setActiveTab] = useState('expense')
  const [newBucketName, setNewBucketName] = useState('')
  const [showNewBucket, setShowNewBucket] = useState(false)
  const [localBuckets, setLocalBuckets] = useState<Record<string, string[]>>({})

  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets(month)
  const { data: statusData } = useBudgetStatus(month)
  const { mutate: upsertBudget } = useUpsertBudget()
  const { mutate: updateGroup } = useUpdateCategoryGroup()
  const { mutate: updateCategory } = useUpdateCategory()

  // All categories for the active tab type
  const tabCategories = (categories as any[]).filter((c: any) => c.type === activeTab)

  // Split into bucketed vs ungrouped within this tab
  const bucketMap = new Map<string, any[]>()
  const tabUngrouped: any[] = []
  for (const cat of tabCategories) {
    if (cat.group) {
      if (!bucketMap.has(cat.group)) bucketMap.set(cat.group, [])
      bucketMap.get(cat.group)!.push(cat)
    } else {
      tabUngrouped.push(cat)
    }
  }

  const dbBucketNames = Array.from(bucketMap.keys())
  const pendingLocal = (localBuckets[activeTab] ?? []).filter(name => !bucketMap.has(name))
  const allBucketNames = [...dbBucketNames, ...pendingLocal]

  // Budget amounts & spending
  const budgetAmounts: Record<string, number> = {}
  for (const b of budgets as any[]) budgetAmounts[(b as any).categoryId] = (b as any).amount

  const spending: Record<string, number> = {}
  if (statusData?.statuses) {
    for (const s of statusData.statuses as any[]) spending[s.categoryId] = s.spent
  }

  const handleSave = (categoryId: string, rupeesStr: string) => {
    const amount = toPaise(rupeesStr)
    if (isNaN(amount) || amount < 0) return
    upsertBudget({ categoryId, month, amount })
  }

  const handleMoveToGroup = (categoryId: string, group: string | null) => {
    updateGroup({ id: categoryId, group })
    if (group) {
      setLocalBuckets(prev => ({
        ...prev,
        [activeTab]: (prev[activeTab] ?? []).filter(name => name !== group),
      }))
    }
  }

  const handleMoveToTab = (categoryId: string, newType: string) => {
    updateCategory({ id: categoryId, type: newType, group: null })
  }

  const handleRemoveBudget = (categoryId: string) => {
    upsertBudget({ categoryId, month, amount: 0 })
  }

  const handleCreateBucket = () => {
    const name = newBucketName.trim()
    if (!name) return
    if (allBucketNames.includes(name)) {
      toast.error(`Bucket "${name}" already exists`)
      return
    }
    setLocalBuckets(prev => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] ?? []), name],
    }))
    setShowNewBucket(false)
    setNewBucketName('')
    toast.success(`Bucket "${name}" created — use ⋯ to assign categories`)
  }

  const switchTab = (id: string) => {
    setActiveTab(id)
    setShowNewBucket(false)
    setNewBucketName('')
  }

  // Cross-tab budget balance check
  const totalIncoming = (categories as any[])
    .filter((c: any) => c.type === 'income')
    .reduce((s: number, c: any) => s + (budgetAmounts[c.id] ?? 0), 0)

  const totalOutgoing = (categories as any[])
    .filter((c: any) => c.type !== 'income')
    .reduce((s: number, c: any) => s + (budgetAmounts[c.id] ?? 0), 0)

  const budgetDiff = totalIncoming - totalOutgoing // positive = unallocated, negative = over budget

  // Tab header totals
  const tabTotals = TABS.map(tab => {
    const cats = (categories as any[]).filter((c: any) => c.type === tab.id)
    const budgeted = cats.reduce((s: number, c: any) => s + (budgetAmounts[c.id] ?? 0), 0)
    const spent = cats.reduce((s: number, c: any) => s + (spending[c.id] ?? 0), 0)
    return { ...tab, budgeted, spent }
  })

  return (
    <div>
      {/* Tab header cards */}
      <div className="flex gap-2 mb-6">
        {tabTotals.map(tab => {
          const isActive = activeTab === tab.id
          const pct = tab.budgeted > 0 ? Math.min((tab.spent / tab.budgeted) * 100, 100) : 0
          const barBg = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={cn(
                'flex-1 rounded-xl border p-4 text-left transition-all',
                isActive ? tab.activeBg : 'bg-zinc-900 border-zinc-600/40 hover:border-zinc-500/50'
              )}
            >
              <p className={cn('text-xs font-medium mb-1', isActive ? tab.color : 'text-zinc-500')}>
                {tab.label}
              </p>
              <p className="text-base font-semibold text-zinc-200 tabular-nums">
                ₹{toRupees(tab.budgeted).toLocaleString('en-IN')}
              </p>
              {tab.budgeted > 0 && (
                <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', barBg)} style={{ width: `${pct}%` }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Budget balance nudge */}
      <AnimatePresence>
        {totalIncoming > 0 && budgetDiff !== 0 && (
          <motion.div
            key="budget-nudge"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center justify-between gap-4 px-4 py-3 rounded-xl border mb-4 text-sm',
              budgetDiff < 0
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{budgetDiff < 0 ? '⚠️' : 'ℹ️'}</span>
              <span>
                {budgetDiff < 0
                  ? <>Budget exceeds income by <strong>₹{toRupees(Math.abs(budgetDiff)).toLocaleString('en-IN')}</strong> — reduce Debt / Savings / Investments or increase Incoming budget.</>
                  : <>₹{toRupees(budgetDiff).toLocaleString('en-IN')} of income is unallocated — assign it to a tab to balance your budget.</>
                }
              </span>
            </div>
            <span className={cn(
              'shrink-0 text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full',
              budgetDiff < 0 ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
            )}>
              {budgetDiff < 0 ? '−' : '+'}₹{toRupees(Math.abs(budgetDiff)).toLocaleString('en-IN')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="space-y-4"
        >
          {/* DB-backed buckets */}
          {dbBucketNames.map(name => (
            <BudgetBucket
              key={name}
              name={name}
              categories={bucketMap.get(name)!}
              budgetAmounts={budgetAmounts}
              spending={spending}
              month={month}
              onSave={handleSave}
              onMoveToGroup={handleMoveToGroup}
              onMoveToTab={handleMoveToTab}
              onRemoveBudget={handleRemoveBudget}
              currentTab={activeTab}
              allBuckets={allBucketNames}
            />
          ))}

          {/* Local-only (empty) buckets */}
          {pendingLocal.map(name => (
            <BudgetBucket
              key={`local-${name}`}
              name={name}
              categories={[]}
              budgetAmounts={budgetAmounts}
              spending={spending}
              month={month}
              onSave={handleSave}
              onMoveToGroup={handleMoveToGroup}
              onMoveToTab={handleMoveToTab}
              onRemoveBudget={handleRemoveBudget}
              currentTab={activeTab}
              allBuckets={allBucketNames}
              isEmpty
            />
          ))}

          {/* Ungrouped items within this tab — shown at the bottom */}
          {tabUngrouped.length > 0 && (
            <BudgetBucket
              name={null}
              categories={tabUngrouped}
              budgetAmounts={budgetAmounts}
              spending={spending}
              month={month}
              onSave={handleSave}
              onMoveToGroup={handleMoveToGroup}
              onMoveToTab={handleMoveToTab}
              onRemoveBudget={handleRemoveBudget}
              currentTab={activeTab}
              allBuckets={allBucketNames}
            />
          )}

          {/* Add bucket row */}
          <div className="pt-2">
            {showNewBucket ? (
              <div className="space-y-1">
                <div className="flex gap-2 items-center px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl focus-within:border-zinc-500 transition-colors">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Bucket name (e.g. Long-term, Liquid…)"
                    value={newBucketName}
                    onChange={e => setNewBucketName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateBucket()
                      if (e.key === 'Escape') { setShowNewBucket(false); setNewBucketName('') }
                    }}
                    className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateBucket}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium px-1 shrink-0"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewBucket(false); setNewBucketName('') }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0"
                  >
                    Cancel
                  </button>
                </div>
                {newBucketName.trim() && allBucketNames.includes(newBucketName.trim()) && (
                  <p className="text-xs text-amber-400 pl-2">A bucket with this name already exists.</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowNewBucket(true)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Bucket
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
