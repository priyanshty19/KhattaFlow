'use client'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { QuickAddModal } from '@/components/domain/transactions/QuickAddModal'
import { EditTransactionModal } from '@/components/domain/transactions/EditTransactionModal'
import { GmailOnboardModal } from '@/components/domain/dashboard/GmailOnboardModal'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto md:ml-64 custom-scroll pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <QuickAddModal />
      <EditTransactionModal />
      <GmailOnboardModal />
    </div>
  )
}
