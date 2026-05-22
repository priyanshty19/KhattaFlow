'use client'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils/cn'
import { X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { CardResultItem } from './CardResultItem'
import { InsightsPanel } from './InsightsPanel'
import type { FunnelResult } from '@/lib/engines/credit-card-engine'

const RESULT_TABS = [
  { id: 'all',      label: 'All Cards' },
  { id: 'insights', label: 'Insights'  },
] as const

type ResultTab = typeof RESULT_TABS[number]['id']

interface ResultsPanelProps {
  result: FunnelResult & { spendSource: string }
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  const [tab, setTab] = useState<ResultTab>('all')
  const { finalRecommendations } = result

  // ── Feedback modal state ──────────────────────────────────────────────────
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackStep, setFeedbackStep] = useState<'prompt' | 'preference' | 'done'>('prompt')
  const [preferredCard, setPreferredCard] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insightsTimerRef = useRef<any>(null)
  const feedbackFiredRef = useRef(false)

  // Show feedback modal 4 seconds after recommendations first appear — regardless of active tab
  useEffect(() => {
    if (feedbackFiredRef.current) return
    insightsTimerRef.current = setTimeout(() => {
      if (!feedbackFiredRef.current) {
        setShowFeedback(true)
      }
    }, 4000)
    return () => {
      if (insightsTimerRef.current) {
        clearTimeout(insightsTimerRef.current)
        insightsTimerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // runs once on mount — ResultsPanel mounts when recommendations arrive

  const handleFeedback = async (liked: boolean) => {
    feedbackFiredRef.current = true
    if (!liked) {
      setFeedbackStep('preference')
      return
    }
    await submitFeedback(liked, undefined)
  }

  const handlePreferenceSubmit = async () => {
    await submitFeedback(false, preferredCard.trim() || undefined)
  }

  const submitFeedback = async (liked: boolean, preferred?: string) => {
    setSubmitting(true)
    const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    try {
      await fetch('/api/credit-cards/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liked,
          preferredCard: preferred,
          recommendedCards: finalRecommendations.map(s => s.card.id),
          month,
        }),
      })
    } catch {
      // silent — feedback failure should never break UX
    } finally {
      setSubmitting(false)
      setFeedbackStep('done')
      setTimeout(() => setShowFeedback(false), 2200)
    }
  }

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {finalRecommendations.length} card{finalRecommendations.length !== 1 ? 's' : ''} recommended
          </p>
          <p className="text-xs text-zinc-500">
            Based on {result.spendSource === 'auto' ? 'your last 3 months of transactions' : 'your entered spending'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/40 rounded-lg p-1">
          {RESULT_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all duration-150',
                tab === t.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* All Cards */}
      {tab === 'all' && (
        <div className="space-y-3">
          {finalRecommendations.map((scored, i) => (
            <CardResultItem key={scored.card.id} scored={scored} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Insights */}
      {tab === 'insights' && (
        <InsightsPanel recommendations={finalRecommendations} />
      )}

      {/* ── Feedback modal ───────────────────────────────────────────────── */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { feedbackFiredRef.current = true; setShowFeedback(false) }}
          />

          <div className="relative z-10 w-full max-w-sm bg-zinc-900 border border-zinc-700/50 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => { feedbackFiredRef.current = true; setShowFeedback(false) }}
              className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {feedbackStep === 'prompt' && (
              <>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Did you like the recommendations?</p>
                <p className="text-xs text-zinc-500 mb-5">Your feedback helps us improve future suggestions.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleFeedback(true)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-semibold transition-all"
                  >
                    <ThumbsUp className="w-4 h-4" /> Yes
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/40 text-zinc-300 rounded-xl text-sm font-semibold transition-all"
                  >
                    <ThumbsDown className="w-4 h-4" /> No
                  </button>
                </div>
              </>
            )}

            {feedbackStep === 'preference' && (
              <>
                <p className="text-sm font-semibold text-zinc-100 mb-1">Which card would you prefer?</p>
                <p className="text-xs text-zinc-500 mb-4">Tell us what you had in mind — it shapes our model.</p>
                <textarea
                  autoFocus
                  value={preferredCard}
                  onChange={e => setPreferredCard(e.target.value)}
                  placeholder="e.g. HDFC Regalia, Axis Magnus…"
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700/50 rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 mb-4"
                />
                <button
                  onClick={handlePreferenceSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl text-sm font-semibold transition-all"
                >
                  {submitting ? 'Saving…' : 'Submit feedback'}
                </button>
              </>
            )}

            {feedbackStep === 'done' && (
              <div className="text-center py-2">
                <div className="text-3xl mb-3">🙏</div>
                <p className="text-sm font-semibold text-zinc-100">Thank you!</p>
                <p className="text-xs text-zinc-500 mt-1">Your feedback will help us build smarter recommendations.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
