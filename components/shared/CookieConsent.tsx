'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'fingrid_cookie_consent'

// Informational, non-blocking cookie notice. FinGrid currently sets only
// strictly-necessary cookies (Clerk auth + Turnstile) and no analytics/ad
// trackers, so this is an acknowledgement — it never gates app usage. The choice
// is persisted in localStorage (no cookie, no server round-trip).
export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true)
    } catch {
      // localStorage unavailable (e.g. privacy mode) — just don't show it.
    }
  }, [])

  const dismiss = (value: 'accepted' | 'dismissed') => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 p-3 md:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-xl border border-zinc-700/60 bg-zinc-900/95 backdrop-blur-md shadow-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <Cookie className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-zinc-300 leading-relaxed">
            FinGrid uses only essential cookies to keep you signed in securely. We don&apos;t use tracking or advertising
            cookies.{' '}
            <Link href={'/settings/policy' as any} className="text-emerald-400 hover:text-emerald-300 underline">
              Learn more
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => dismiss('dismissed')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors sm:order-2"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => dismiss('accepted')}
            className="h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors sm:order-1"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
