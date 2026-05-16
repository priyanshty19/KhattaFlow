'use client'
import { Bell } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { MonthSelector } from '@/components/shared/MonthSelector'
import { cn } from '@/lib/utils/cn'

interface TopBarProps {
  title: string
  month?: string
  onMonthChange?: (month: string) => void
  actions?: React.ReactNode
  className?: string
}

export function TopBar({ title, month, onMonthChange, actions, className }: TopBarProps) {
  return (
    <header className={cn(
      'sticky top-0 z-30 flex items-center justify-between h-14 px-8',
      'bg-zinc-950/80 backdrop-blur-md border-b border-zinc-600/40',
      className
    )}>
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-base text-emerald-400 tracking-tight">{title}</h1>
        {month && onMonthChange && (
          <MonthSelector value={month} onChange={onMonthChange} />
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  )
}
