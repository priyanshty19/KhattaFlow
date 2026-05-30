// app/(dashboard)/transactions/page.tsx
'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { TransactionList } from '@/components/domain/transactions/TransactionList'
import { TransactionFilter } from '@/components/domain/transactions/TransactionFilter'
import { TopBar } from '@/components/layout/TopBar'
import { MoneyTabs } from '@/components/layout/MoneyTabs'
import { getCurrentMonth } from '@/lib/utils/date'
import { useUIStore } from '@/stores/ui.store'

interface TransactionFilterState {
  type?: string
  categoryId?: string
  paymentMethod?: string
  search?: string
}

export default function TransactionsPage() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [filter, setFilter] = useState<TransactionFilterState>({})
  const openQuickAdd = useUIStore(s => s.openQuickAdd)

  return (
    <>
      <TopBar
        title="Transactions"
        month={month}
        onMonthChange={setMonth}
        actions={
          <button
            onClick={() => openQuickAdd()}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        }
      />
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-5 max-w-[1200px] mx-auto w-full">
        <MoneyTabs />
        <TransactionFilter value={filter} onChange={setFilter} />
        <TransactionList month={month} filter={filter} />
      </div>
    </>
  )
}
