'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'

export function GmailConnect() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    fetch('/api/connect/gmail/status')
      .then(r => r.json())
      .then(data => {
        setStatus(data.connected ? 'connected' : 'disconnected')
        setEmail(data.email)
      })
      .catch(() => setStatus('disconnected'))
  }, [])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/connect/gmail', { method: 'DELETE' })
      setStatus('disconnected')
      setEmail(null)
      toast.success('Gmail disconnected')
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  if (status === 'loading') return (
    <div className="flex items-center gap-2 text-zinc-500">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Checking…</span>
    </div>
  )

  if (status === 'connected') return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-zinc-300">{email}</span>
        <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">Connected</span>
      </div>
      <button
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
      >
        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
      </button>
    </div>
  )

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-400">Gmail not connected</span>
      </div>
      <a
        href="/api/connect/gmail"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/40 rounded-lg text-xs text-zinc-200 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" />
        Connect Gmail
      </a>
    </div>
  )
}
