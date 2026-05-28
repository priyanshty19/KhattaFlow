'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, IndianRupee } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { useUpdateTransaction } from '@/lib/queries/transactions'
import { useCategories } from '@/lib/queries'
import { useQuery } from '@tanstack/react-query'
import { toPaise, toRupees } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'
import { PAYMENT_METHOD_LABELS } from '@/constants/categories'

const TYPES = [
  { value: 'expense',    label: 'Expense',    col: 'border-red-500/40 bg-red-500/10 text-red-400' },
  { value: 'income',     label: 'Income',     col: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  { value: 'investment', label: 'Invest',     col: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  { value: 'savings',    label: 'Savings',    col: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
]

export function EditTransactionModal() {
  const { editTransactionId, closeEditTransaction } = useUIStore()
  const { mutate: updateTransaction, isPending } = useUpdateTransaction()
  const { data: categories } = useCategories()

  const { data: transaction } = useQuery({
    queryKey: ['transaction', editTransactionId],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${editTransactionId}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    enabled: !!editTransactionId,
    staleTime: 0,
  })

  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('upi')

  useEffect(() => {
    if (transaction) {
      setType(transaction.type)
      setAmount(String(toRupees(transaction.amount)))
      setCategoryId(transaction.categoryId)
      setDescription(transaction.description ?? '')
      setDate(transaction.date?.slice(0, 10) ?? '')
      setPaymentMethod(transaction.paymentMethod ?? 'upi')
    }
  }, [transaction])

  const filteredCategories = (categories ?? []).filter((c: any) => c.type === type)

  const handleSubmit = () => {
    if (!editTransactionId || !amount || !categoryId) return
    updateTransaction(
      { id: editTransactionId, data: { amount: toPaise(amount), type: type as any, categoryId, description: description || undefined, date, paymentMethod: paymentMethod as any } },
      { onSuccess: closeEditTransaction }
    )
  }

  const isOpen = !!editTransactionId

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" onClick={closeEditTransaction} />
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:pl-64 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="pointer-events-auto w-full max-w-md mx-4"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-zinc-100">Edit Transaction</h2>
                <button onClick={closeEditTransaction} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-5">
                {TYPES.map(({ value, label, col }) => (
                  <button key={value} onClick={() => setType(value)}
                    className={cn('py-2 rounded-xl text-xs font-medium border transition-all',
                      type === value ? col : 'border-zinc-800 text-zinc-600 hover:text-zinc-400')}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative mb-4">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                  className="w-full pl-9 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-xl text-2xl font-bold text-zinc-100 focus:outline-none focus:border-zinc-600 transition-colors tabular-nums" />
              </div>

              <div className="mb-4">
                <label className="text-xs text-zinc-500 mb-2 block">Category</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scroll">
                  {filteredCategories.map((cat: any) => (
                    <button key={cat.id} onClick={() => setCategoryId(cat.id)}
                      className={cn('px-2.5 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5',
                        categoryId === cat.id ? 'border-zinc-600 bg-zinc-800 text-zinc-200' : 'border-zinc-800 text-zinc-500 hover:text-zinc-400')}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Description</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors" />
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap mb-5">
                {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                  <button key={v} onClick={() => setPaymentMethod(v)}
                    className={cn('px-2.5 py-1 rounded-lg text-xs border transition-all',
                      paymentMethod === v ? 'border-zinc-600 bg-zinc-800 text-zinc-200' : 'border-zinc-800 text-zinc-600 hover:text-zinc-400')}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={closeEditTransaction} className="px-5 py-3 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl text-sm transition-colors">Cancel</button>
                <button onClick={handleSubmit} disabled={!amount || !categoryId || isPending}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl font-semibold text-sm transition-all">
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
