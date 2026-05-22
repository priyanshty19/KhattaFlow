'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Target,
  CreditCard, Settings, Plus, Upload, Wallet,
} from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'

const NAV_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions',  label: 'Transactions', icon: ArrowLeftRight },
  { href: '/analytics',     label: 'Analytics',    icon: PieChart },
  { href: '/budgets',       label: 'Budget',       icon: Target },
  { href: '/credit-cards',  label: 'Credit Cards', icon: CreditCard },
]

const BOTTOM_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/settings/import', label: 'Import CSV', icon: Upload },
  { href: '/settings',        label: 'Settings',   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { openQuickAdd } = useUIStore()

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 z-40 flex-col bg-zinc-950 border-r border-zinc-600/40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base text-emerald-400 tracking-tight">KhattaFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-r-2 border-emerald-400'
                  : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100 font-medium'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 pt-3 border-t border-zinc-600/40 space-y-0.5">
        {/* Add Transaction CTA */}
        <button
          onClick={() => openQuickAdd()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all duration-150 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>

        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href as any}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all duration-150"
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        ))}

        <div className="flex items-center gap-3 px-3 py-2.5">
          <UserButton />
          <span className="text-xs text-zinc-500">Account</span>
        </div>
      </div>
    </aside>
  )
}
