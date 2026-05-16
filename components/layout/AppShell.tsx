'use client'
import { Sidebar } from './Sidebar'
import { QuickAddModal } from '@/components/domain/transactions/QuickAddModal'
import { EditTransactionModal } from '@/components/domain/transactions/EditTransactionModal'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto ml-64 custom-scroll">
        {children}
      </main>
      <QuickAddModal />
      <EditTransactionModal />
    </div>
  )
}
