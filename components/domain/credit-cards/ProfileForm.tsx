'use client'
import { useState, useEffect, useCallback } from 'react'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'
import { SpendAdjuster } from './SpendAdjuster'
import { cn } from '@/lib/utils/cn'
import type { FunnelResult } from '@/lib/engines/credit-card-engine'

const BANKS: { label: string; value: string }[] = [
  { label: 'HDFC',      value: 'HDFC'              },
  { label: 'SBI',       value: 'SBI'               },
  { label: 'ICICI',     value: 'ICICI Bank'         },
  { label: 'Axis',      value: 'Axis Bank'          },
  { label: 'Kotak',     value: 'Kotak'              },
  { label: 'AMEX',      value: 'American Express'   },
  { label: 'IndusInd',  value: 'Induslnd Bank'      },
  { label: 'Yes Bank',  value: 'Yes Bank'           },
]

const FEE_OPTIONS = [
  { id: 'no_fee',     label: 'No Fee',        desc: 'Zero joining fee only' },
  { id: 'low_fee',    label: 'Under ₹1,000',  desc: 'Low joining fee cards' },
  { id: 'no_concern', label: 'Any Amount',    desc: 'Best rewards regardless of fee' },
] as const

const CREDIT_BANDS = [
  { min: 300,  max: 649,  label: 'Poor',      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'    },
  { min: 650,  max: 699,  label: 'Fair',      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { min: 700,  max: 749,  label: 'Good',      color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { min: 750,  max: 799,  label: 'Very Good', color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20'   },
  { min: 800,  max: 900,  label: 'Excellent', color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20' },
]

function getCreditBand(score: number) {
  return CREDIT_BANDS.find(b => score >= b.min && score <= b.max) ?? CREDIT_BANDS[0]
}

interface ProfileFormProps {
  prefillIncome: number
  prefillCreditScore: number
  onResults: (result: FunnelResult & { spendSource: string }) => void
}

export function ProfileForm({ prefillIncome, prefillCreditScore, onResults }: ProfileFormProps) {
  const [step, setStep] = useState(1)
  const [income, setIncome] = useState(String(prefillIncome || ''))
  const [creditScore, setCreditScore] = useState(prefillCreditScore || 700)

  // Sync when parent fetches user data async (prefills arrive after mount)
  useEffect(() => {
    if (prefillIncome > 0) setIncome(String(prefillIncome))
  }, [prefillIncome])
  useEffect(() => {
    if (prefillCreditScore > 0) setCreditScore(prefillCreditScore)
  }, [prefillCreditScore])
  const [spendDistribution, setSpendDistribution] = useState<Record<string, number>>({})
  const [spendSource, setSpendSource] = useState<'auto' | 'manual' | 'insufficient_data'>('manual')
  const [spendLoading, setSpendLoading] = useState(false)
  const [feePreference, setFeePreference] = useState<'no_fee' | 'low_fee' | 'no_concern'>('no_concern')
  const [preferredBanks, setPreferredBanks] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const band = getCreditBand(creditScore)

  const fetchSpend = useCallback(async () => {
    setSpendLoading(true)
    try {
      const res = await fetch('/api/credit-cards/spend-inference')
      const data = await res.json()
      if (data.source === 'auto' && Object.keys(data.spendDistribution).length > 0) {
        setSpendDistribution(data.spendDistribution)
        setSpendSource('auto')
      } else {
        setSpendSource('insufficient_data')
      }
    } catch {
      setSpendSource('insufficient_data')
    } finally {
      setSpendLoading(false)
    }
  }, [])

  // Load preferences + spend on mount
  useEffect(() => {
    fetchSpend()
    fetch('/api/credit-cards/preferences')
      .then(r => r.json())
      .then(data => {
        if (data.joiningFeePreference) setFeePreference(data.joiningFeePreference)
        if (data.preferredBanks?.length) setPreferredBanks(data.preferredBanks)
      })
      .catch(() => {})
  }, [fetchSpend])

  const toggleBank = (bankValue: string) => {
    setPreferredBanks(prev =>
      prev.includes(bankValue) ? prev.filter(b => b !== bankValue) : prev.length < 3 ? [...prev, bankValue] : prev
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Persist preferences
      await fetch('/api/credit-cards/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joiningFeePreference: feePreference, preferredBanks }),
      })

      const res = await fetch('/api/credit-cards/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideSpend: spendDistribution,
          creditScore,
          monthlyIncome: income ? Number(income) : undefined,
          joiningFeePreference: feePreference,
          preferredBanks,
        }),
      })

      // Guard against non-JSON responses (e.g. HTML error pages in dev mode)
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        console.error('[CredWise] recommend API returned non-JSON:', res.status, await res.text().catch(() => ''))
        return
      }

      const data = await res.json()
      if (data.finalRecommendations) {
        onResults(data)
      } else if (data.error) {
        console.error('[CredWise] recommend API error:', data.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700/40 rounded-xl p-6 flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              'h-1.5 w-full rounded-full transition-all duration-300',
              s <= step ? 'bg-emerald-500' : 'bg-zinc-800'
            )} />
            <span className={cn('text-[10px] font-medium', s <= step ? 'text-emerald-400' : 'text-zinc-600')}>
              {['Profile', 'Spending', 'Preferences'][s - 1]}
            </span>
          </div>
        ))}
      </div>

      {/* ── Step 1: Basic Details ── */}
      {step === 1 && (
        <div className="flex flex-col flex-1 gap-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Basic Details</h2>
            <p className="text-xs text-zinc-500 mt-1">We use this to pre-qualify you for cards.</p>
          </div>

          {/* Income */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">Monthly Income (In Hand)</label>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-400 transition-colors text-sm">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={income}
                onChange={e => {
                  // Strip everything except digits so Indian comma notation (1,00,000) works
                  const raw = e.target.value.replace(/[^0-9]/g, '')
                  setIncome(raw)
                }}
                placeholder="100000"
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-800/60 border border-zinc-700/60 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-all tabular-nums"
              />
            </div>
            <div className="flex items-center justify-between">
              {prefillIncome > 0 && (
                <p className="text-[11px] text-emerald-400/70">Pre-filled from your FinGrid profile</p>
              )}
              {income && Number(income) > 0 && (
                <p className="text-[11px] text-zinc-600 ml-auto tabular-nums">
                  = ₹{Number(income).toLocaleString('en-IN')}/mo
                </p>
              )}
            </div>
          </div>

          {/* Credit Score */}
          <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 font-medium">Credit Score</label>
              <span className={cn('text-2xl font-bold tabular-nums', band.color)}>{creditScore}</span>
            </div>

            {/* Gradient band */}
            <div className="relative h-2.5 w-full rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-400 via-yellow-400 via-green-400 to-emerald-500" />
              <div
                className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow-lg ring-2 ring-black/40"
                style={{ left: `calc(${((creditScore - 300) / 600) * 100}% - 3px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>Poor</span><span>Fair</span><span>Good</span><span>V.Good</span><span>Excellent</span>
            </div>

            <input
              type="range" min={300} max={900} step={1}
              value={creditScore}
              onChange={e => setCreditScore(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />

            <div className={cn('flex items-start gap-2 text-xs px-3 py-2 rounded-lg border', band.bg)}>
              <span className={band.color}>✦</span>
              <span className={cn('font-medium', band.color)}>{band.label}</span>
              <span className="text-zinc-500">
                — {creditScore >= 800 ? 'eligible for premium & metal cards'
                  : creditScore >= 750 ? 'most rewards cards available'
                  : creditScore >= 700 ? 'standard rewards cards available'
                  : creditScore >= 650 ? 'entry-level & building-credit cards'
                  : 'secured cards recommended'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="mt-auto w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            Continue to Spending <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Step 2: Spending ── */}
      {step === 2 && (
        <div className="flex flex-col flex-1 gap-5 overflow-y-auto">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Spending Habits</h2>
            <p className="text-xs text-zinc-500 mt-1">Adjust how much you spend per category monthly.</p>
          </div>

          <SpendAdjuster
            spendDistribution={spendDistribution}
            onChange={setSpendDistribution}
            spendSource={spendSource}
            onRefresh={fetchSpend}
            loading={spendLoading}
            monthlyIncome={income ? Number(income) : 0}
          />

          <div className="flex gap-3 pt-2 mt-auto">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-sm transition-colors flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={Object.keys(spendDistribution).length === 0}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Continue to Preferences <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preferences ── */}
      {step === 3 && (
        <div className="flex flex-col flex-1 gap-5">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Preferences</h2>
            <p className="text-xs text-zinc-500 mt-1">Fine-tune your card recommendations.</p>
          </div>

          {/* Joining fee */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-400 font-medium">Joining Fee Preference</label>
            <div className="grid grid-cols-3 gap-2">
              {FEE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFeePreference(opt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all',
                    feePreference === opt.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
                  )}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className="text-[10px] text-zinc-500 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preferred banks */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 font-medium">Preferred Banks</label>
              <span className="text-[10px] text-zinc-600">Optional — max 3</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {BANKS.map(bank => {
                const selected = preferredBanks.includes(bank.value)
                const disabled = !selected && preferredBanks.length >= 3
                return (
                  <button
                    key={bank.value}
                    onClick={() => toggleBank(bank.value)}
                    disabled={disabled}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      selected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : disabled
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed'
                        : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    {bank.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 border border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-lg text-sm transition-colors flex items-center gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                  Analysing your profile…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get Recommendations
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
