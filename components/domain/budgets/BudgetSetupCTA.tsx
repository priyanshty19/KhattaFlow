'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { useCategories, useUpsertBudget } from '@/lib/queries'
import { toPaise } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'

const SUGGESTED_BUDGETS: Record<string, number> = {
  'home-loan': 25000, 'maa': 6000, 'macbook-emi': 5000,
  'airtel': 2500, 'jio': 400, 'subscriptions': 1500,
  'utilities': 5000, 'office-travel': 3000, 'food-dining': 8000,
  'shopping': 5000, 'credit-card': 25000, 'mutual-funds': 15000,
}

export function BudgetSetupCTA({ month }: { month: string }) {
  const { data: categories } = useCategories()
  const { mutate: upsertBudget, isPending } = useUpsertBudget()
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const expenseCategories = (categories ?? []).filter((c: any) =>
    c.type === 'expense' || c.type === 'investment' || c.type === 'savings'
  )

  const handleSaveAll = async () => {
    const entries = Object.entries(amounts).filter(([, v]) => v && parseFloat(v) > 0)
    for (const [categoryId, value] of entries) {
      await new Promise<void>(resolve =>
        upsertBudget({ categoryId, month, amount: toPaise(value) }, { onSuccess: () => resolve(), onError: () => resolve() })
      )
    }
    setSaved(true)
  }

  if (saved) return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">🎯</div>
      <h3 className="text-lg font-medium text-zinc-200 mb-2">Budget set!</h3>
      <p className="text-sm text-zinc-500">Your spending limits are active for this month.</p>
    </div>
  )

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
          <Target className="w-5 h-5 text-zinc-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-200">Set up your monthly budget</h2>
          <p className="text-sm text-zinc-500">Enter limits per category. Skip any you don't want to track.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {expenseCategories.map((cat: any, i: number) => {
          const suggested = SUGGESTED_BUDGETS[cat.slug]
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 bg-zinc-800/50 rounded-xl p-3"
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm text-zinc-300 flex-1 truncate">{cat.name}</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">₹</span>
                <input
                  type="number"
                  placeholder={suggested ? String(suggested) : '0'}
                  value={amounts[cat.id] ?? ''}
                  onChange={e => setAmounts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  className="w-28 pl-6 pr-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500 tabular-nums"
                />
              </div>
            </motion.div>
          )
        })}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={isPending || Object.values(amounts).every(v => !v || parseFloat(v) <= 0)}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-semibold text-sm transition-all"
      >
        {isPending ? 'Saving...' : 'Save Budget'}
      </button>
    </div>
  )
}
