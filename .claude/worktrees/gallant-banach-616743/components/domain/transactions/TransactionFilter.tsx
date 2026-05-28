'use client'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface FilterState {
  type?: string
  search?: string
}

interface TransactionFilterProps {
  value: FilterState
  onChange: (v: FilterState) => void
}

const TYPES = [
  { value: '',           label: 'All' },
  { value: 'income',     label: 'Income' },
  { value: 'expense',    label: 'Expense' },
  { value: 'investment', label: 'Investment' },
  { value: 'savings',    label: 'Savings' },
]

export function TransactionFilter({ value, onChange }: TransactionFilterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 px-4 py-3 rounded-xl border border-zinc-600/40">
      {/* Type pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TYPES.map(({ value: v, label }) => {
          const isActive = value.type === v || (!value.type && v === '')
          return (
            <button
              key={v}
              onClick={() => onChange({ ...value, type: v || undefined })}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={value.search ?? ''}
          onChange={e => onChange({ ...value, search: e.target.value || undefined })}
          className="pl-8 pr-8 py-1.5 bg-zinc-800 border border-zinc-600/40 rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors w-52"
        />
        {value.search && (
          <button
            onClick={() => onChange({ ...value, search: undefined })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  )
}
