'use client'
import { Plus, Wallet } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { NotificationCenter } from '@/components/layout/NotificationCenter'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'

interface TopBarProps {
  title: string
  month?: string
  onMonthChange?: (month: string) => void
  actions?: React.ReactNode
  className?: string
}

export function TopBar({ title, month, onMonthChange, actions, className }: TopBarProps) {
  const { openQuickAdd } = useUIStore()
  return (
    <header className={cn(
      'sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-8',
      'bg-zinc-950/80 backdrop-blur-md border-b border-zinc-600/40',
      className
    )}>
      {/* Left: logo (mobile) + title + month */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* FinGrid logo — mobile only */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-emerald-400 tracking-tight">FinGrid</span>
        </div>
        {/* Page title — desktop only */}
        <h1 className="hidden md:block font-semibold text-base text-emerald-400 tracking-tight shrink-0">{title}</h1>
        {month && onMonthChange && (
          <MonthSelector value={month} onChange={onMonthChange} />
        )}
      </div>

      {/* Right: actions + quick-add (mobile) + bell + user */}
      <div className="flex items-center gap-2 md:gap-3">
        {actions}
        {/* Quick-add FAB — mobile only */}
        <button
          onClick={() => openQuickAdd()}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors active:scale-95"
          aria-label="Add transaction"
        >
          <Plus className="w-4 h-4" />
        </button>
        <NotificationCenter />
        <UserButton />
      </div>
    </header>
  )
}
