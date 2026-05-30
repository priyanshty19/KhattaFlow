'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, PieChart, Target, Rocket, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions',  label: 'Transactions', icon: ArrowLeftRight },
  { href: '/analytics',     label: 'Analytics',    icon: PieChart },
  { href: '/budgets',       label: 'Budget',       icon: Target },
  { href: '/goals',         label: 'Goals',        icon: Rocket },
  { href: '/split',         label: 'Split',        icon: Users },
  { href: '/settings',      label: 'Settings',     icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-1 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl min-w-[56px] transition-colors',
                isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]')} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
