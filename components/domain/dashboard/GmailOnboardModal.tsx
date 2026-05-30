'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mail, CheckCircle2, RefreshCw,
  ArrowUpCircle, ArrowDownCircle, TrendingUp, CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import { autoAssignAll } from '@/lib/utils/email-auto-assign'
import { ParsedFinancialEmail } from '@/lib/engines/financial-email-parser'

// ── Constants ──────────────────────────────────────────────────────────────────

// Scoped to userId so dismiss doesn't bleed across accounts / re-logins
const dismissedKey = (userId: string) => `fg_scan_dismissed_${userId}`

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  type: string
  slug: string
}

interface EnrichedEmail extends ParsedFinancialEmail {
  suggestedCategorySlug?: string | null
}

type ModalState = 'checking' | 'hidden' | 'scanning' | 'ready' | 'importing' | 'done'

interface ScanSummary {
  importable: number
  expenses: number
  investments: number
  income: number
  ccStatements: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSummary(items: EnrichedEmail[]): ScanSummary {
  const importable = items.filter(r => r.type !== 'cc_statement').length
  const expenses   = items.filter(r => r.categoryHint === 'expense').length
  const investments = items.filter(r => r.categoryHint === 'investment').length
  const income     = items.filter(r => r.categoryHint === 'income' && r.type !== 'cc_statement').length
  const ccStatements = items.filter(r => r.type === 'cc_statement').length
  return { importable, expenses, investments, income, ccStatements }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GmailOnboardModal() {
  const { user } = useUser()
  const [state, setState]           = useState<ModalState>('checking')
  const [results, setResults]       = useState<EnrichedEmail[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [progress, setProgress]     = useState({ scanned: 0, total: 0 })
  const [importedCount, setImportedCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // ── Initial check ──────────────────────────────────────────────────────────
  // Depends on user.id so it re-runs once Clerk resolves the session.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user?.id) return // Wait for Clerk to resolve

    // If this specific user already dismissed or completed import, skip.
    // Key is scoped to userId so it resets correctly for different accounts.
    if (localStorage.getItem(dismissedKey(user.id)) === '1') {
      setState('hidden')
      return
    }

    // Check server-side conditions (Gmail connected + no prior import)
    Promise.all([
      fetch('/api/financial-fetch/prompt-status').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ])
      .then(([status, cats]) => {
        if (!status.shouldPrompt) {
          setState('hidden')
          return
        }
        // Onboarding scan is a ONE-SHOT. Mark it done up front so it never
        // auto-fires again on this device — even if the scan finds nothing,
        // errors, or the user navigates away mid-scan. Any future sync is a
        // manual rescan from the Fetch section (/settings/import). This is the
        // fix for the modal popping up "at random times" after onboarding.
        if (user.id) localStorage.setItem(dismissedKey(user.id), '1')
        setCategories(Array.isArray(cats) ? cats : [])
        setState('scanning')
        startScan()
      })
      .catch(() => setState('hidden'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Auto-dismiss after "done" state
  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(() => setState('hidden'), 3000)
    return () => clearTimeout(t)
  }, [state])

  // ── Scan ──────────────────────────────────────────────────────────────────
  async function startScan() {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/financial-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthsBack: 1 }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) { setState('hidden'); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'progress') {
              setProgress({ scanned: event.scanned, total: event.total })
            } else if (event.type === 'done') {
              const items: EnrichedEmail[] = (event.results ?? []).map((r: EnrichedEmail) => ({
                ...r,
                date: r.date ? new Date(r.date as unknown as string) : null,
              }))

              // No importable results → quietly dismiss
              const importable = items.filter(r => r.type !== 'cc_statement')
              if (!importable.length) {
                setState('hidden')
                return
              }

              setResults(items)
              setState('ready')
            } else if (event.type === 'error') {
              setState('hidden')
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') setState('hidden')
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function dismiss() {
    abortRef.current?.abort()
    if (user?.id) localStorage.setItem(dismissedKey(user.id), '1')
    setState('hidden')
  }

  async function importAll() {
    setState('importing')

    const assignments = autoAssignAll(results, categories)
    const items = results
      .filter(r => r.type !== 'cc_statement' && assignments[r.gmailMessageId])
      .map(r => ({ parsed: r, categoryId: assignments[r.gmailMessageId] }))

    if (!items.length) {
      dismiss()
      return
    }

    try {
      const res = await fetch('/api/financial-fetch/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()

      if (res.ok) {
        setImportedCount(data.count)
        setState('done')
        toast.success(`${data.count} transaction${data.count !== 1 ? 's' : ''} imported from Gmail`)
      } else {
        toast.error('Import failed — you can retry from the Sync Transactions page.')
        dismiss()
      }
    } catch {
      toast.error('Import failed — you can retry from the Sync Transactions page.')
      dismiss()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const summary = results.length ? getSummary(results) : null
  const pct = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0

  return (
    <AnimatePresence>
      {state !== 'checking' && state !== 'hidden' && (
        <motion.div
          key="gmail-onboard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            key="gmail-onboard-modal"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="relative bg-zinc-900 border border-zinc-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Gmail Sync</p>
                  <p className="text-[11px] text-zinc-500">Last 30 days · auto-categorised</p>
                </div>
              </div>

              {(state === 'ready' || state === 'scanning') && (
                <button
                  onClick={dismiss}
                  aria-label="Dismiss"
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Body ───────────────────────────────────────────────────── */}
            <div className="px-5 py-4">

              {/* Scanning */}
              {state === 'scanning' && (
                <div className="flex flex-col gap-3 py-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      Scanning your Gmail inbox…
                    </span>
                    {progress.total > 0 && (
                      <span className="tabular-nums text-zinc-500">
                        {progress.scanned} / {progress.total}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    {progress.total > 0 ? (
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    ) : (
                      <div className="h-full bg-emerald-500/60 rounded-full animate-pulse" style={{ width: '40%' }} />
                    )}
                  </div>

                  <p className="text-xs text-zinc-600">
                    Looking for bank debits, SIPs, EMIs, salary credits, and more…
                  </p>
                </div>
              )}

              {/* Ready */}
              {state === 'ready' && summary && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-base font-semibold text-zinc-100">
                      Found {summary.importable} transaction{summary.importable !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Categories are auto-assigned — you can edit any entry later.
                    </p>
                  </div>

                  {/* Type breakdown chips */}
                  <div className="grid grid-cols-2 gap-2">
                    {summary.expenses > 0 && (
                      <div className="flex items-center gap-2.5 bg-zinc-800/60 rounded-xl px-3 py-2.5">
                        <ArrowUpCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 leading-none mb-0.5">Expenses</p>
                          <p className="text-sm font-semibold text-zinc-200 leading-none">{summary.expenses}</p>
                        </div>
                      </div>
                    )}
                    {summary.investments > 0 && (
                      <div className="flex items-center gap-2.5 bg-zinc-800/60 rounded-xl px-3 py-2.5">
                        <TrendingUp className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 leading-none mb-0.5">Investments</p>
                          <p className="text-sm font-semibold text-zinc-200 leading-none">{summary.investments}</p>
                        </div>
                      </div>
                    )}
                    {summary.income > 0 && (
                      <div className="flex items-center gap-2.5 bg-zinc-800/60 rounded-xl px-3 py-2.5">
                        <ArrowDownCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 leading-none mb-0.5">Income</p>
                          <p className="text-sm font-semibold text-zinc-200 leading-none">{summary.income}</p>
                        </div>
                      </div>
                    )}
                    {summary.ccStatements > 0 && (
                      <div className="flex items-center gap-2.5 bg-zinc-800/60 rounded-xl px-3 py-2.5">
                        <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <p className="text-[10px] text-zinc-500 leading-none mb-0.5">CC Statements</p>
                          <p className="text-[11px] text-zinc-600 italic leading-none mt-0.5">info only</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Importing */}
              {state === 'importing' && (
                <div className="flex flex-col items-center gap-3 py-5">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm text-zinc-300">Importing transactions…</p>
                </div>
              )}

              {/* Done */}
              {state === 'done' && (
                <div className="flex flex-col items-center gap-3 py-5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <p className="text-sm font-semibold text-zinc-200">
                    {importedCount} transaction{importedCount !== 1 ? 's' : ''} imported!
                  </p>
                  <p className="text-xs text-zinc-500">Your dashboard is now up to date.</p>
                </div>
              )}
            </div>

            {/* ── Footer (ready state only) ───────────────────────────────── */}
            {state === 'ready' && (
              <div className="flex items-center gap-3 px-5 py-4 border-t border-zinc-800">
                <button
                  onClick={importAll}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 rounded-xl font-semibold text-sm transition-all"
                >
                  Import All
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                  Skip for now
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
