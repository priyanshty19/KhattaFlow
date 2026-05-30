'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

// Mobile-only segmented sub-nav for the "Money" section. Desktop exposes these leaves
// directly in the Sidebar, so this is hidden at md+. Rendered at the top of the
// Transactions / Analytics / Budget pages.
const MONEY_TABS = [
  { href: '/transactions', label: 'Transactions' },
  { href: '/analytics',    label: 'Analytics' },
  { href: '/budgets',      label: 'Budget' },
]

export function MoneyTabs() {
  const pathname = usePathname()
  return (
    <div className="md:hidden flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
      {MONEY_TABS.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href as any}
            className={cn(
              'flex-1 text-center px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              isActive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 active:text-zinc-200'
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
