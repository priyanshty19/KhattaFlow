'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Users, Briefcase, ArrowRight, ChevronDown } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { CurrencyDisplay } from '@/components/shared/CurrencyDisplay'
import { CreateGroupModal } from '@/components/domain/split/CreateGroupModal'
import { useSplitGroups, type SplitGroupSummary } from '@/lib/queries/split'
import { formatRelativeTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils/cn'

function GroupCard({ g }: { g: SplitGroupSummary }) {
  return (
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

      {/* Splitwise-style per-member breakdown lines */}
      {(g.myBreakdown?.length ?? 0) > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-800/70 space-y-0.5">
          {g.myBreakdown.slice(0, 3).map((b, i) => (
            <p key={i} className="text-[11px] text-zinc-500">
              {b.owe ? (
                <>You owe <span className="text-rose-400/90">{b.name}</span> </>
              ) : (
                <><span className="text-emerald-400/90">{b.name}</span> owes you </>
              )}
              <CurrencyDisplay amount={b.amount} size="xs" className="text-zinc-400" />
            </p>
          ))}
          {g.myBreakdown.length > 3 && (
            <p className="text-[11px] text-zinc-600">+{g.myBreakdown.length - 3} more</p>
          )}
        </div>
      )}
    </Link>
  )
}

export default function SplitPage() {
  const { data, isLoading } = useSplitGroups()
  const [createOpen, setCreateOpen] = useState(false)
  const [showSettled, setShowSettled] = useState(false)
  const groups = data?.groups ?? []

  const { activeGroups, settledGroups, overallNet, owedToMe, iOwe } = useMemo(() => {
    const active: SplitGroupSummary[] = []
    const settled: SplitGroupSummary[] = []
    let net = 0
    let owed = 0
    let owe = 0
    for (const g of groups) {
      net += g.myNet
      if (g.myNet > 0) owed += g.myNet
      else if (g.myNet < 0) owe += -g.myNet
      if (g.myNet === 0) settled.push(g)
      else active.push(g)
    }
    return { activeGroups: active, settledGroups: settled, overallNet: net, owedToMe: owed, iOwe: owe }
  }, [groups])

  return (
    <>
      <TopBar title="Split & Share" showQuickAdd={false} />
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1200px] mx-auto w-full">
        {/* Overall position across all groups */}
        {!isLoading && groups.length > 0 && (
          <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-5">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-zinc-500">
                  {overallNet > 0 ? 'Overall, you are owed' : overallNet < 0 ? 'Overall, you owe' : 'Overall'}
                </p>
                {overallNet !== 0 ? (
                  <CurrencyDisplay amount={Math.abs(overallNet)} size="xl" className={cn('mt-0.5', overallNet > 0 ? 'text-emerald-400' : 'text-rose-400')} />
                ) : (
                  <p className="mt-0.5 text-xl font-semibold text-zinc-200">You&apos;re all settled up</p>
                )}
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[11px] text-zinc-500">You are owed</p>
                  <CurrencyDisplay amount={owedToMe} size="sm" className="text-emerald-400" />
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-zinc-500">You owe</p>
                  <CurrencyDisplay amount={iOwe} size="sm" className="text-rose-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-zinc-100">Your groups</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Split expenses with friends or track a business budget.</p>
          </div>
          {groups.length > 0 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold shrink-0 transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" /> New group
            </button>
          )}
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
          <>
            {activeGroups.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeGroups.map((g) => <GroupCard key={g.id} g={g} />)}
              </div>
            )}

            {settledGroups.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowSettled((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showSettled && 'rotate-180')} />
                  {showSettled ? 'Hide' : 'Show'} {settledGroups.length} settled-up {settledGroups.length === 1 ? 'group' : 'groups'}
                </button>
                {showSettled && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {settledGroups.map((g) => <GroupCard key={g.id} g={g} />)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
