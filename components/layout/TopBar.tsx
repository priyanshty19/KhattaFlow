'use client'
import { Plus } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { NotificationCenter } from '@/components/layout/NotificationCenter'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'

interface TopBarProps {
  title: string
  month?: string
  onMonthChange?: (month: string) => void
  actions?: React.ReactNode
  /**
   * Show the mobile Add-Transaction quick-add FAB. Defaults to true (right for the
   * Money/Dashboard surfaces). Set false on sections whose primary action isn't
   * "add transaction" (Split, Goals, Profile) so they expose their own in-page action
   * instead of a misleading global "+".
   */
  showQuickAdd?: boolean
  /**
   * Tailwind max-width class for the bar's inner content, so the title/actions row
   * centers on the SAME width box as the page body below it (otherwise the title sits
   * flush-left of centered content on wide monitors). Pass the value matching the
   * page container. Defaults to the dashboard width.
   */
  maxWidth?: string
  className?: string
}

export function TopBar({ title, month, onMonthChange, actions, showQuickAdd = true, maxWidth = 'max-w-[1400px]', className }: TopBarProps) {
  const { openQuickAdd } = useUIStore()
  return (
    <header className={cn(
      'sticky top-0 z-30 h-14 px-4 md:px-8',
      'bg-zinc-950/80 backdrop-blur-md border-b border-zinc-600/40',
      className
    )}>
      <div className={cn('flex items-center justify-between h-full w-full mx-auto', maxWidth)}>
        {/* Left: logo (mobile) + title + month */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* myFinGrid logo — mobile only */}
          <div className="flex md:hidden shrink-0">
            <Logo size="sm" href="/" />
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
          {/* Quick-add FAB — mobile only, contextual */}
          {showQuickAdd && (
            <button
              onClick={() => openQuickAdd()}
              className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors active:scale-95"
              aria-label="Add transaction"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          <NotificationCenter />
        </div>
      </div>
    </header>
  )
}
