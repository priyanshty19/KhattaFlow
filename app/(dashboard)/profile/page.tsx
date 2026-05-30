'use client'
import Link from 'next/link'
import { useUser, UserButton, useClerk } from '@clerk/nextjs'
import { Settings, Upload, CreditCard, ShieldCheck, ChevronRight, LogOut } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

// Profile hub — home for the low-frequency utilities that used to crowd the nav.
// Also the only mobile entry point to Credit Cards (previously unreachable from the
// bottom nav). Desktop still exposes Settings/Sync/Credit Cards directly in the Sidebar.
const LINKS: {
  href: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { href: '/credit-cards',   label: 'Credit Cards',      description: 'Find your best-fit card', icon: CreditCard },
  { href: '/settings/import', label: 'Sync Transactions', description: 'Import from Gmail & SMS',  icon: Upload },
  { href: '/settings',        label: 'Settings',          description: 'Profile, goals, categories', icon: Settings },
  { href: '/settings/policy', label: 'Privacy & Terms',   description: 'Policies and your data', icon: ShieldCheck },
]

export default function ProfilePage() {
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()

  return (
    <>
      <TopBar title="Profile" showQuickAdd={false} maxWidth="max-w-2xl" />
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Profile</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Your account, tools, and settings.</p>
        </div>

        {/* Account card — whole card opens Clerk account management; the avatar
            still opens its own menu (manage / sign out) on click. */}
        <button
          type="button"
          onClick={() => openUserProfile()}
          className="w-full text-left bg-zinc-900 border border-zinc-600/40 rounded-xl p-5 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors"
        >
          <span onClick={e => e.stopPropagation()} className="shrink-0">
            <UserButton />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-100 truncate">{user?.fullName ?? 'Your account'}</p>
            <p className="text-xs text-zinc-500 truncate">{user?.primaryEmailAddress?.emailAddress ?? '—'}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
        </button>

        {/* Tools & settings */}
        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl divide-y divide-zinc-800 overflow-hidden">
          {LINKS.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href as any}
              className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
            </Link>
          ))}
        </div>

        {/* Sign out — explicit, discoverable logout (the Clerk account modal has none). */}
        <button
          type="button"
          onClick={() => signOut()}
          className="w-full bg-zinc-900 border border-zinc-600/40 rounded-xl flex items-center gap-3 px-5 py-4 hover:bg-red-500/10 hover:border-red-500/30 transition-colors group"
        >
          <div className="w-9 h-9 rounded-lg bg-zinc-800 group-hover:bg-red-500/15 flex items-center justify-center shrink-0 transition-colors">
            <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
          </div>
          <span className="text-sm font-medium text-zinc-200 group-hover:text-red-300 transition-colors">Sign out</span>
        </button>
      </div>
    </>
  )
}
