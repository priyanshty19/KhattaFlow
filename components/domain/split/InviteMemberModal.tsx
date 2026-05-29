'use client'
import { useState } from 'react'
import { Copy, Check, Mail } from 'lucide-react'
import { SplitModal } from './SplitModal'
import { useInviteMember } from '@/lib/queries/split'

export function InviteMemberModal({ groupId, open, onClose }: { groupId: string; open: boolean; onClose: () => void }) {
  const invite = useInviteMember(groupId)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = () => {
    if (!email.trim()) return
    invite.mutate(
      { email: email.trim(), name: name.trim() || undefined },
      {
        onSuccess: (res) => {
          setInviteUrl(res.inviteUrl)
          setEmail('')
          setName('')
        },
      },
    )
  }

  const copy = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const close = () => {
    setInviteUrl(null)
    onClose()
  }

  return (
    <SplitModal open={open} title="Invite a member" onClose={close}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Their display name"
            className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <button
          onClick={submit}
          disabled={!email.trim() || invite.isPending}
          className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold transition-colors inline-flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          {invite.isPending ? 'Sending…' : 'Send invite'}
        </button>

        {inviteUrl && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
            <p className="text-xs text-zinc-400 mb-2">Invite sent. Share this link too:</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 h-9 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 truncate"
              />
              <button
                onClick={copy}
                className="h-9 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </SplitModal>
  )
}
