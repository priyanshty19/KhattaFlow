'use client'
import { UserPlus, Crown, Clock } from 'lucide-react'
import type { SplitMemberDTO } from '@/lib/queries/split'
import { cn } from '@/lib/utils/cn'

export function MemberList({ members, onInvite }: { members: SplitMemberDTO[]; onInvite: () => void }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200">Members</h3>
        <button
          onClick={onInvite}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> Invite
        </button>
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
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                <Clock className="w-2.5 h-2.5" /> pending
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
