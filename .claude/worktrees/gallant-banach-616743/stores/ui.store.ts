import { create } from 'zustand'

interface UIStore {
  // Quick add modal
  isQuickAddOpen: boolean
  openQuickAdd: (defaults?: Partial<QuickAddDefaults>) => void
  closeQuickAdd: () => void
  quickAddDefaults: Partial<QuickAddDefaults>

  // Sidebar
  isSidebarCollapsed: boolean
  toggleSidebar: () => void

  // Edit transaction modal
  editTransactionId: string | null
  openEditTransaction: (id: string) => void
  closeEditTransaction: () => void
}

interface QuickAddDefaults {
  type: string
  categoryId: string
  date: string
}

export const useUIStore = create<UIStore>((set) => ({
  isQuickAddOpen: false,
  quickAddDefaults: {},
  openQuickAdd: (defaults = {}) => set({ isQuickAddOpen: true, quickAddDefaults: defaults }),
  closeQuickAdd: () => set({ isQuickAddOpen: false, quickAddDefaults: {} }),

  isSidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),

  editTransactionId: null,
  openEditTransaction: (id) => set({ editTransactionId: id }),
  closeEditTransaction: () => set({ editTransactionId: null }),
}))
