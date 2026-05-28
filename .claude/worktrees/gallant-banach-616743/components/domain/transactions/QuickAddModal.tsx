'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, IndianRupee } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { useCreateTransaction } from '@/lib/queries/transactions'
import { useCategories, useCreateCategory } from '@/lib/queries'
import { toPaise } from '@/lib/utils/currency'
import { todayISO } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'
import { PAYMENT_METHOD_LABELS } from '@/constants/categories'

const TYPES = [
  { value: 'expense',    label: 'Expense',    color: 'text-red-400 border-red-500/40 bg-red-500/10' },
  { value: 'income',     label: 'Income',     color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { value: 'investment', label: 'Investment', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
  { value: 'savings',    label: 'Savings',    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
]

const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS)

export function QuickAddModal() {
  const { isQuickAddOpen, closeQuickAdd, quickAddDefaults, isSidebarCollapsed } = useUIStore()
  const { mutate: createTransaction, isPending } = useCreateTransaction()
  const { mutate: createCategory, isPending: isCreatingCategory } = useCreateCategory()
  const { data: categories } = useCategories()

  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#94A3B8')

  const filteredCategories = (categories ?? []).filter((c: any) => c.type === type)

  useEffect(() => {
    if (filteredCategories.length > 0 && !filteredCategories.find((c: any) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id)
    }
  }, [type, categories])

  useEffect(() => {
    if (quickAddDefaults.type) setType(quickAddDefaults.type)
    if (quickAddDefaults.categoryId) setCategoryId(quickAddDefaults.categoryId)
    if (quickAddDefaults.date) setDate(quickAddDefaults.date)
  }, [quickAddDefaults])

  const handleSubmit = () => {
    if (!amount || !categoryId) return
    const paise = toPaise(amount)
    if (isNaN(paise) || paise <= 0) return
    createTransaction(
      { amount: paise, type: type as any, categoryId, description: description || undefined, date, paymentMethod: paymentMethod as any },
      { onSuccess: () => { closeQuickAdd(); resetForm() } }
    )
  }

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setDate(todayISO())
    setType('expense')
  }

  const sidebarOffset = isSidebarCollapsed ? 'sm:pl-16' : 'sm:pl-64'

  return (
    <AnimatePresence>
      {isQuickAddOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50"
            onClick={closeQuickAdd}
          />

          <div
            key="modal-wrapper"
            className={cn(
              'fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none',
              sidebarOffset
            )}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="pointer-events-auto w-full sm:max-w-md sm:mx-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) handleSubmit()
                if (e.key === 'Escape') closeQuickAdd()
              }}
            >
              <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-zinc-100">Add Transaction</h2>
                  <button
                    onClick={closeQuickAdd}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mb-5">
                  {TYPES.map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setType(value)}
                      className={cn(
                        'py-2 rounded-xl text-xs font-medium border transition-all',
                        type === value ? color : 'border-zinc-800 text-zinc-600 bg-transparent hover:text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="relative mb-4">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    autoFocus
                    inputMode="decimal"
                    className="w-full pl-9 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-2xl font-bold text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-600 transition-colors tabular-nums"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-zinc-500">Category</label>
                    <button
                      onClick={() => setShowNewCategory(v => !v)}
                      className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-1"
                    >
                      <span className="text-base leading-none">+</span> New
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scroll mb-2">
                    {filteredCategories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={cn(
                          'px-2 py-2 rounded-xl text-xs border transition-all text-left truncate',
                          categoryId === cat.id
                            ? 'border-zinc-600 bg-zinc-800 text-zinc-200'
                            : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                        )}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full inline-block mr-1.5"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {showNewCategory && (
                    <div className="flex gap-2 mt-1 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={e => setNewCatColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        title="Pick colour"
                      />
                      <input
                        type="text"
                        placeholder="Category name…"
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newCatName.trim()) {
                            e.stopPropagation()
                            createCategory(
                              { name: newCatName.trim(), type, color: newCatColor },
                              { onSuccess: (cat: any) => { setCategoryId(cat.id); setShowNewCategory(false); setNewCatName('') } }
                            )
                          }
                        }}
                        className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                        autoFocus
                      />
                      <button
                        disabled={!newCatName.trim() || isCreatingCategory}
                        onClick={() => createCategory(
                          { name: newCatName.trim(), type, color: newCatColor },
                          { onSuccess: (cat: any) => { setCategoryId(cat.id); setShowNewCategory(false); setNewCatName('') } }
                        )}
                        className="text-xs text-emerald-400 disabled:text-zinc-600 hover:text-emerald-300 transition-colors font-medium"
                      >
                        {isCreatingCategory ? '…' : 'Add'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Description</label>
                    <input
                      type="text"
                      placeholder="What was this for?"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-xs text-zinc-500 mb-1.5 block">Payment</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PAYMENT_METHODS.map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs border transition-all',
                          paymentMethod === value
                            ? 'border-zinc-600 bg-zinc-800 text-zinc-200'
                            : 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!amount || !categoryId || isPending}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                    amount && categoryId
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                  )}
                >
                  {isPending ? 'Saving...' : 'Add Transaction'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
