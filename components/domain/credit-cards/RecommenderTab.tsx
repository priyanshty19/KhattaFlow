'use client'
import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { ProfileForm } from './ProfileForm'
import { ResultsPanel } from './ResultsPanel'
import type { FunnelResult } from '@/lib/engines/credit-card-engine'

type Results = FunnelResult & { spendSource: string }

interface RecommenderTabProps {
  prefillIncome?: number
  prefillCreditScore?: number
}

export function RecommenderTab({ prefillIncome = 0, prefillCreditScore = 0 }: RecommenderTabProps) {
  const [results, setResults] = useState<Results | null>(null)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
      {/* Left: Profile form */}
      <div className="xl:sticky xl:top-6">
        <ProfileForm
          prefillIncome={prefillIncome}
          prefillCreditScore={prefillCreditScore}
          onResults={setResults}
        />
      </div>

      {/* Right: Results or empty state */}
      <div>
        {results ? (
          <ResultsPanel result={results} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[420px] bg-zinc-900 border border-zinc-700/40 rounded-xl p-8 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-200">Your recommendations will appear here</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                Fill in your profile and spending habits on the left, then click
                &ldquo;Get Recommendations&rdquo; to see value-ranked credit card picks.
              </p>
            </div>
            <div className="flex flex-col gap-2 items-center mt-2">
              {[
                '₹ net annual value scored for each card',
                'Auto-inferred from your transaction history',
                'Personalised to your income & credit score',
              ].map(text => (
                <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="w-1 h-1 rounded-full bg-emerald-500/60" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
