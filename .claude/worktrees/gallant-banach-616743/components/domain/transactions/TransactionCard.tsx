'use client'
import { motion } from 'framer-motion'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils/cn'
import { toRupees } from '@/lib/utils/currency'
import { useDeleteTransaction } from '@/lib/queries/transactions'
import { useUIStore } from '@/stores/ui.store'
import { PAYMENT_METHOD_LABELS } from '@/constants/categories'

interface TransactionCardProps {
  transaction: {
    id: string
    amount: number
    type: string
    description?: string | null
    date: string
    paymentMethod?: string | null
    category: { name: string; color: string; icon?: string | null }
  }
  index?: number
  compact?: boolean
  grouped?: boolean
}

export function TransactionCard({ transaction: t, index = 0, compact = false, grouped = false }: TransactionCardProps) {
  const { mutate: deleteTransaction } = useDeleteTransaction()
  const openEdit = useUIStore(s => s.openEditTransaction)
  const isIncome = t.type === 'income'
  const amountDisplay = toRupees(t.amount)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className={cn(
        'group flex items-center gap-4 px-4 py-3',
        'hover:bg-zinc-800/40 transition-colors duration-100',
        !grouped && 'rounded-xl border border-zinc-600/40 bg-zinc-900',
        compact && 'py-2.5'
      )}
    >
      {/* Category dot */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: t.category.color }}
      />

      {/* Description + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {t.description || t.category.name}
        </p>
        {!compact && (
          <p className="text-xs text-zinc-500 mt-0.5">{t.category.name}</p>
        )}
      </div>

      {/* Payment method badge */}
      {!compact && t.paymentMethod && (
        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded shrink-0">
          {PAYMENT_METHOD_LABELS[t.paymentMethod] ?? t.paymentMethod}
        </span>
      )}

      {/* Amount */}
      <span className={cn(
        'text-sm font-semibold tabular-nums shrink-0',
        isIncome ? 'text-emerald-400' : 'text-zinc-200'
      )}>
        {isIncome ? '+' : '−'}₹{amountDisplay.toLocaleString('en-IN')}
      </span>

      {/* Actions */}
      {!compact && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 shrink-0">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[140px] bg-zinc-900 border border-zinc-600/60 rounded-xl shadow-xl p-1 z-50"
              sideOffset={4}
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg cursor-pointer outline-none"
                onSelect={() => openEdit(t.id)}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg cursor-pointer outline-none"
                onSelect={() => deleteTransaction(t.id)}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </motion.div>
  )
}
