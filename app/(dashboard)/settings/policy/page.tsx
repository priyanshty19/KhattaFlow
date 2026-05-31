'use client'
import { useState } from 'react'
import { ShieldCheck, FileText, Cookie } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { cn } from '@/lib/utils/cn'
import { LAST_UPDATED, PrivacyPolicy, TermsOfService, CookiePolicy } from '@/components/legal/policy-content'

type Tab = 'privacy' | 'terms' | 'cookies'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
  { id: 'terms', label: 'Terms', icon: FileText },
  { id: 'cookies', label: 'Cookies', icon: Cookie },
]

export default function PolicyPage() {
  const [tab, setTab] = useState<Tab>('privacy')

  return (
    <>
      <TopBar title="Privacy & Terms" showQuickAdd={false} maxWidth="max-w-2xl" />
      <div className="flex flex-col gap-4 md:gap-6 px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Privacy &amp; Terms</h2>
          <p className="text-sm text-zinc-400 mt-0.5">How myFinGrid handles your data, and the terms of use.</p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-lg p-0.5 self-start">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                tab === id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5 md:p-6">
          {tab === 'privacy' && <PrivacyPolicy />}
          {tab === 'terms' && <TermsOfService />}
          {tab === 'cookies' && <CookiePolicy />}
          <p className="text-xs text-zinc-600 mt-6 pt-4 border-t border-zinc-800">Last updated: {LAST_UPDATED}</p>
        </div>
      </div>
    </>
  )
}
