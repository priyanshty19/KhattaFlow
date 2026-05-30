'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wallet, Rocket, Users, CircleUser } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// 5-tab bottom nav (was 7 — overflowed small screens). MONEY collapses Transactions/
// Analytics/Budget behind a single tab that opens the default leaf (/transactions) and
// shows a segmented sub-nav (MoneyTabs) at the top of those pages. Profile holds the
// low-frequency utilities (Settings, Sync, Account, Credit Cards).
const TABS: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  match: (p: string) => boolean
}[] = [
  { href: '/',             label: 'Home',    icon: Home,       match: (p) => p === '/' },
  { href: '/transactions', label: 'Money',   icon: Wallet,     match: (p) => ['/transactions', '/analytics', '/budgets'].some((r) => p === r || p.startsWith(r + '/')) },
  { href: '/goals',        label: 'Goals',   icon: Rocket,     match: (p) => p === '/goals' || p.startsWith('/goals/') },
  { href: '/split',        label: 'Split',   icon: Users,      match: (p) => p === '/split' || p.startsWith('/split/') },
  { href: '/profile',      label: 'Profile', icon: CircleUser, match: (p) => p === '/profile' || p.startsWith('/profile/') || p === '/settings' || p.startsWith('/settings/') },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around px-1 py-2">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const isActive = match(pathname)
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl min-w-[60px] transition-colors',
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
