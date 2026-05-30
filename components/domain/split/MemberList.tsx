'use client'
import { useState } from 'react'
import { UserPlus, Crown, Clock, Link2, Check, X } from 'lucide-react'
import type { SplitMemberDTO } from '@/lib/queries/split'
import { useMemberInviteLink, useGroupInviteLink, useRemoveMember } from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'

export function MemberList({ groupId, members, onInvite, canManage = false }: { groupId: string; members: SplitMemberDTO[]; onInvite: () => void; canManage?: boolean }) {
  const inviteLink = useMemberInviteLink(groupId)
  const groupLink = useGroupInviteLink(groupId)
  const removeMember = useRemoveMember(groupId)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedGroup, setCopiedGroup] = useState(false)

  const remove = (m: SplitMemberDTO) => {
    if (window.confirm(`Remove ${m.name} from this group?`)) {
      removeMember.mutate(m.id)
    }
  }

  const copyLink = (memberId: string) => {
    inviteLink.mutate(memberId, {
      onSuccess: async ({ inviteUrl }) => {
        try {
          await navigator.clipboard.writeText(inviteUrl)
          setCopiedId(memberId)
          setTimeout(() => setCopiedId((id) => (id === memberId ? null : id)), 1500)
        } catch {
          // Clipboard unavailable (e.g. insecure context) — surface the link instead.
          window.prompt('Copy this invite link:', inviteUrl)
        }
      },
    })
  }

  const copyGroupLink = () => {
    groupLink.mutate(undefined, {
      onSuccess: async ({ inviteUrl }) => {
        try {
          await navigator.clipboard.writeText(inviteUrl)
          setCopiedGroup(true)
          setTimeout(() => setCopiedGroup(false), 1500)
        } catch {
          window.prompt('Copy this invite link:', inviteUrl)
        }
      },
    })
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Members</h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={copyGroupLink}
            disabled={groupLink.isPending}
            title="Copy a shareable invite link for this group"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {copiedGroup ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
            {copiedGroup ? 'Copied' : 'Link'}
          </button>
          <button
            onClick={onInvite}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Invite
          </button>
        </div>
      </div>
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5">
            <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', m.status === 'pending' ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500/15 text-emerald-400')}>
              {m.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 text-sm text-zinc-200 truncate">{m.name}</span>
            {m.role === 'owner' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
            {m.status === 'pending' && (
              <>
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                  <Clock className="w-2.5 h-2.5" /> pending
                </span>
                {m.email && (
                  <button
                    onClick={() => copyLink(m.id)}
                    disabled={inviteLink.isPending}
                    title="Copy invite link"
                    className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-1.5 py-0.5 rounded-full transition-colors disabled:opacity-50"
                  >
                    {copiedId === m.id ? <Check className="w-2.5 h-2.5" /> : <Link2 className="w-2.5 h-2.5" />}
                    {copiedId === m.id ? 'Copied' : 'Copy link'}
                  </button>
                )}
              </>
            )}
            {canManage && m.role !== 'owner' && (
              <button
                onClick={() => remove(m)}
                disabled={removeMember.isPending}
                title={`Remove ${m.name}`}
                aria-label={`Remove ${m.name}`}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
