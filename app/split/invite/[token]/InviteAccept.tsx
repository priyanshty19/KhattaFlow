'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

/**
 * Client island for an authenticated invitee: POSTs to the accept endpoint once,
 * then redirects to the server-decided destination (group for new users,
 * dashboard for existing ones).
 */
export function InviteAccept({ token, groupName }: { token: string; groupName: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      try {
        const res = await fetch(`/api/split/invite/${token}/accept`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error ?? 'Could not accept this invite.')
          return
        }
        setDone(true)
        router.push((data.redirect ?? '/') as any)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })()
  }, [token, router])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-sm text-zinc-300">{error}</p>
        <button
          onClick={() => router.push('/' as any)}
          className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
        >
          Go to dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {done ? (
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      ) : (
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      )}
      <p className="text-sm text-zinc-300">
        {done ? 'Joined! Taking you in…' : `Joining "${groupName}"…`}
      </p>
    </div>
  )
}
