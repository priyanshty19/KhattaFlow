'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Plus, Users, Briefcase, ArrowRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { CreateGroupModal } from '@/components/domain/split/CreateGroupModal'
import { useSplitGroups } from '@/lib/queries/split'
import { formatRelativeTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

export default function SplitPage() {
  const { data, isLoading } = useSplitGroups()
  const [createOpen, setCreateOpen] = useState(false)
  const groups = data?.groups ?? []

  return (
    <>
      <TopBar
        title="Split & Share"
        actions={
          <button
            onClick={() => setCreateOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> New group
          </button>
        }
      />
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1200px]">
        <div className="mb-5">
          <h2 className="text-lg md:text-xl font-semibold text-zinc-100">Your groups</h2>
          <p className="text-sm text-zinc-400 mt-0.5">Split expenses with friends or track a business budget.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : !groups.length ? (
          <EmptyState
            icon={Users}
            title="No groups yet"
            description="Create a group for a trip, an outing, or your business to start splitting expenses."
            action={{ label: 'Create your first group', onClick: () => setCreateOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/split/${g.id}` as any}
                className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-colors p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', g.type === 'business' ? 'bg-amber-500/10' : 'bg-emerald-500/10')}>
                      {g.type === 'business' ? <Briefcase className="w-4 h-4 text-amber-400" /> : <Users className="w-4 h-4 text-emerald-400" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{g.name}</p>
                      <p className="text-xs text-zinc-500">{g.memberCount} {g.memberCount === 1 ? 'member' : 'members'} · {g.expenseCount} {g.expenseCount === 1 ? 'expense' : 'expenses'}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-zinc-500">
                      {g.myNet > 0 ? 'You are owed' : g.myNet < 0 ? 'You owe' : 'Settled up'}
                    </p>
                    {g.myNet !== 0 ? (
                      <CurrencyDisplay amount={Math.abs(g.myNet)} size="md" className={g.myNet > 0 ? 'text-emerald-400' : 'text-rose-400'} />
                    ) : (
                      <span className="text-sm text-zinc-400">All clear</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-600">{formatRelativeTime(g.lastActivity)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
