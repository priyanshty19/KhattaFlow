'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, MoreHorizontal, Loader2 } from 'lucide-react'
import { useTransactionsByCategory, useDeleteTransaction, useUpdateTransaction } from '@/lib/queries/transactions'
import { useCategories } from '@/lib/queries'
import { useUIStore } from '@/stores/ui.store'
import { toRupees } from '@/lib/utils/currency'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

interface Props {
  categoryId: string
  categoryType: string
  isUngrouped: boolean
  month: string
}

interface TxMenuProps {
  txId: string
  pos: { top: number; left: number }
  isUngrouped: boolean
  categoryType: string
  onRemoveFromBucket: () => void
  onDelete: () => void
  onClose: () => void
}

function TxContextMenu({ pos, isUngrouped, onRemoveFromBucket, onDelete, onClose }: TxMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
      className="z-[9999] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl min-w-44 py-1 text-xs"
    >
      {!isUngrouped && (
        <button
          className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
          onClick={() => { onRemoveFromBucket(); onClose() }}
        >
          Remove from bucket
        </button>
      )}
      {isUngrouped && (
        <>
          <button
            className="w-full text-left px-3 py-1.5 text-zinc-300 hover:bg-zinc-800"
            onClick={() => { onRemoveFromBucket(); onClose() }}
          >
            Move to bucket
          </button>
          <div className="my-1 border-t border-zinc-800" />
          <button
            className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-zinc-800 hover:text-red-300"
            onClick={() => { onDelete(); onClose() }}
          >
            Delete transaction
          </button>
        </>
      )}
    </div>,
    document.body
  )
}

export function CategoryTransactions({ categoryId, categoryType, isUngrouped, month }: Props) {
  const [open, setOpen] = useState(false)
  const [txMenu, setTxMenu] = useState<{ id: string; pos: { top: number; left: number } } | null>(null)

  const { data, isLoading } = useTransactionsByCategory(open ? categoryId : '', month)
  const { mutate: deleteTransaction } = useDeleteTransaction()
  const { mutate: updateTransaction } = useUpdateTransaction()
  const { data: allCategories = [] } = useCategories()
  const openQuickAdd = useUIStore(s => s.openQuickAdd)

  const items: any[] = data?.items ?? []

  const openTxMenu = (e: React.MouseEvent<HTMLButtonElement>, txId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const top = rect.bottom + 4
    const left = Math.min(rect.right - 176, window.innerWidth - 184)
    setTxMenu({ id: txId, pos: { top, left } })
  }

  // Find an ungrouped category of the same type to move the transaction into
  const handleRemoveFromBucket = (txId: string) => {
    if (isUngrouped) {
      // Already ungrouped — "Move to bucket" opens QuickAdd to re-assign
      openQuickAdd({ type: categoryType })
      return
    }
    const target = (allCategories as any[]).find(
      (c: any) => c.type === categoryType && !c.group && c.id !== categoryId
    )
    if (!target) {
      toast.error('No ungrouped category available — create one first or remove from bucket via the category menu')
      return
    }
    updateTransaction(
      { id: txId, data: { categoryId: target.id } },
      { onSuccess: () => toast.success('Moved to ungrouped') }
    )
  }

  return (
    <div className="border-t border-zinc-800/40">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-2 text-xs text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/20 transition-colors"
      >
        <ChevronRight className={cn('w-3 h-3 transition-transform', open && 'rotate-90')} />
        {open
          ? `${items.length} transaction${items.length !== 1 ? 's' : ''} this month`
          : 'View transactions'}
        {isLoading && open && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-3 space-y-0.5">
              {items.length === 0 && !isLoading && (
                <p className="text-xs text-zinc-700 py-1">No transactions this month.</p>
              )}
              {items.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 py-1.5">
                  <span className="text-xs text-zinc-400 flex-1 truncate">
                    {tx.description || tx.category?.name || '—'}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-500 shrink-0">
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className={cn(
                    'text-xs tabular-nums font-medium shrink-0 w-20 text-right',
                    tx.type === 'income' ? 'text-emerald-400' : 'text-zinc-300'
                  )}>
                    ₹{toRupees(tx.amount).toLocaleString('en-IN')}
                  </span>
                  <button
                    onClick={e => openTxMenu(e, tx.id)}
                    className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors shrink-0"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {txMenu && (
        <TxContextMenu
          txId={txMenu.id}
          pos={txMenu.pos}
          isUngrouped={isUngrouped}
          categoryType={categoryType}
          onRemoveFromBucket={() => handleRemoveFromBucket(txMenu.id)}
          onDelete={() => deleteTransaction(txMenu.id)}
          onClose={() => setTxMenu(null)}
        />
      )}
    </div>
  )
}
