'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthLabel, getPreviousMonth, getNextMonth, getCurrentMonth } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

interface MonthSelectorProps {
  value: string
  onChange: (month: string) => void
  className?: string
}

export function MonthSelector({ value, onChange, className }: MonthSelectorProps) {
  return (
    <div className={cn(
      'flex items-center gap-1 bg-zinc-900 border border-zinc-600/50 rounded-full px-1 py-1',
      className
    )}>
      <button
        onClick={() => onChange(getPreviousMonth(value))}
        className="p-1 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <span className="px-2 text-sm font-semibold text-zinc-200 min-w-[110px] text-center">
        {formatMonthLabel(value)}
      </span>

      <button
        onClick={() => onChange(getNextMonth(value))}
        className="p-1 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
