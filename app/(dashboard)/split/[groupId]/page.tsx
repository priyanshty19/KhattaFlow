'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Settings } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useSplitGroup } from '@/lib/queries/split'
import { BalanceSummary } from '@/components/domain/split/BalanceSummary'
import { MemberList } from '@/components/domain/split/MemberList'
import { SettlementSuggestions } from '@/components/domain/split/SettlementSuggestions'
import { ActivityFeed } from '@/components/domain/split/ActivityFeed'
import { AddExpenseModal } from '@/components/domain/split/AddExpenseModal'
import { InviteMemberModal } from '@/components/domain/split/InviteMemberModal'
import { GroupSettingsModal } from '@/components/domain/split/GroupSettingsModal'
import { BusinessDashboard } from '@/components/domain/split/BusinessDashboard'

export default function GroupDetailPage() {
  const params = useParams<{ groupId: string }>()
  const router = useRouter()
  const groupId = params.groupId
  const { data: group, isLoading } = useSplitGroup(groupId)
  const [addOpen, setAddOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  if (isLoading || !group) {
    return (
      <>
        <TopBar title="Group" showQuickAdd={false} />
        <div className="px-4 md:px-6 lg:px-8 py-6 max-w-[1100px] mx-auto w-full space-y-3">
          <div className="h-24 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 animate-pulse" />
          <div className="h-48 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 animate-pulse" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title={group.name}
        showQuickAdd={false}
        actions={
          <button
            onClick={() => setAddOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add expense
          </button>
        }
      />
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-[1100px] mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/split' as any)}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All groups
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>

        {group.type === 'business' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <BusinessDashboard group={group} />
              </div>
              <MemberList groupId={groupId} members={group.members} onInvite={() => setInviteOpen(true)} />
            </div>
            <ActivityFeed groupId={groupId} groupType="business" expenses={group.expenses} members={group.members} myMemberId={group.myMemberId} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <SettlementSuggestions groupId={groupId} suggestions={group.suggestions} members={group.members} simplifyDebts={group.simplifyDebts} canSimplify={group.myRole === 'owner'} />
              <ActivityFeed groupId={groupId} groupType="personal" expenses={group.expenses} members={group.members} myMemberId={group.myMemberId} />
            </div>
            <div className="space-y-4">
              <BalanceSummary balances={group.balances} members={group.members} myMemberId={group.myMemberId} suggestions={group.suggestions} />
              <MemberList groupId={groupId} members={group.members} onInvite={() => setInviteOpen(true)} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile add-expense FAB */}
      <button
        onClick={() => setAddOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform"
        aria-label="Add expense"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddExpenseModal
        groupId={groupId}
        groupType={group.type}
        members={group.members}
        myMemberId={group.myMemberId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
      <InviteMemberModal groupId={groupId} open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <GroupSettingsModal group={group} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
