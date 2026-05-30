'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LogOut, Trash2 } from 'lucide-react'
import { SplitModal } from './SplitModal'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import {
  useUpdateGroup,
  useLeaveGroup,
  useDeleteGroup,
  type SplitGroupDetail,
} from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'

export function GroupSettingsModal({
  group,
  open,
  onClose,
}: {
  group: SplitGroupDetail
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const update = useUpdateGroup(group.id)
  const leave = useLeaveGroup(group.id)
  const deleteGroup = useDeleteGroup()
  const isOwner = group.myRole === 'owner'

  const [name, setName] = useState(group.name)
  const [simplify, setSimplify] = useState(group.simplifyDebts)

  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? '—'
  const myNet = group.balances.find((b) => b.memberId === group.myMemberId)?.net ?? 0
  const canLeave = myNet === 0

  const saveName = () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === group.name) return
    update.mutate({ name: trimmed })
  }

  const toggleSimplify = () => {
    const next = !simplify
    setSimplify(next)
    update.mutate({ simplifyDebts: next })
  }

  const onLeave = () => {
    if (!canLeave) return
    if (confirm('Leave this group?')) {
      leave.mutate(undefined, { onSuccess: () => router.push('/split' as any) })
    }
  }

  const onDelete = () => {
    if (confirm('Delete this group and all its expenses? This cannot be undone.')) {
      deleteGroup.mutate(group.id, { onSuccess: () => router.push('/split' as any) })
    }
  }

  return (
    <SplitModal open={open} title="Group settings" onClose={onClose}>
      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Group name</label>
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
              className="flex-1 h-11 px-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 disabled:opacity-60"
            />
            {isOwner && (
              <button
                onClick={saveName}
                disabled={update.isPending || !name.trim() || name.trim() === group.name}
                className="h-11 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Save
              </button>
            )}
          </div>
        </div>

        {/* Simplify debts toggle (personal groups) */}
        {group.type === 'personal' && (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Simplify group debts</p>
              <p className="text-xs text-zinc-500 mt-0.5">Combine debts to reduce the number of payments.</p>
            </div>
            <button
              role="switch"
              aria-checked={simplify}
              onClick={isOwner ? toggleSimplify : undefined}
              disabled={!isOwner || update.isPending}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60',
                simplify ? 'bg-emerald-500' : 'bg-zinc-700',
              )}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', simplify && 'translate-x-5')} />
            </button>
          </div>
        )}

        {/* Member balances */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-2">Member balances</p>
          <div className="space-y-1.5">
            {group.balances.map((b) => (
              <div key={b.memberId} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300 truncate">
                  {nameOf(b.memberId)}{b.memberId === group.myMemberId ? ' (you)' : ''}
                </span>
                <span className={cn('text-xs', b.net > 0 ? 'text-emerald-400' : b.net < 0 ? 'text-rose-400' : 'text-zinc-500')}>
                  {b.net === 0 ? 'settled' : b.net > 0 ? 'gets back ' : 'owes '}
                  {b.net !== 0 && <CurrencyDisplay amount={Math.abs(b.net)} size="xs" className="ml-0.5" />}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          {!isOwner && (
            <>
              <button
                onClick={onLeave}
                disabled={!canLeave || leave.isPending}
                className="w-full h-10 rounded-xl border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-500/[0.05] text-rose-400 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:border-zinc-800 disabled:hover:bg-transparent"
              >
                <LogOut className="w-4 h-4" /> Leave group
              </button>
              {!canLeave && (
                <p className="text-[11px] text-amber-400/90 text-center">Settle up your balance before you can leave.</p>
              )}
            </>
          )}
          {isOwner && (
            <button
              onClick={onDelete}
              disabled={deleteGroup.isPending}
              className="w-full h-10 rounded-xl border border-zinc-800 hover:border-rose-500/40 hover:bg-rose-500/[0.05] text-rose-400 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete group
            </button>
          )}
        </div>
      </div>
    </SplitModal>
  )
}
