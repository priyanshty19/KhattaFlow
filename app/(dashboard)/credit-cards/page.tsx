'use client'
import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { RecommenderTab } from '@/components/domain/credit-cards/RecommenderTab'
import { MyCardsTab } from '@/components/domain/credit-cards/MyCardsTab'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { id: 'recommender', label: 'Recommender' },
  { id: 'my-cards',    label: 'My Cards'    },
] as const

type TabId = typeof TABS[number]['id']

export default function CreditCardsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('recommender')
  const [prefillIncome, setPrefillIncome] = useState(0)
  const [prefillCreditScore, setPrefillCreditScore] = useState(0)

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(u => {
      if (u?.monthlySalary) setPrefillIncome(Math.round(u.monthlySalary / 100))
      if (u?.creditScore) setPrefillCreditScore(u.creditScore)
    }).catch(() => {})
  }, [])

  return (
    <>
      <TopBar
        title="Credit Cards"
        actions={
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <span className="text-[10px] uppercase tracking-wider text-emerald-500/70 font-bold">Powered by</span>
            <span className="text-xs font-bold text-zinc-300">CredWise</span>
          </div>
        }
      />

      {/* Tab strip */}
      <div className="flex items-center gap-1 px-4 md:px-8 pt-4 pb-0">
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/40 rounded-lg p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 md:px-8 py-4 md:py-6 max-w-[1400px]">
        {activeTab === 'recommender' && (
          <RecommenderTab prefillIncome={prefillIncome} prefillCreditScore={prefillCreditScore} />
        )}
        {activeTab === 'my-cards'    && <MyCardsTab />}
      </div>
    </>
  )
}
