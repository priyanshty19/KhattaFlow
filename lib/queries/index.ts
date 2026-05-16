import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ── Analytics ──────────────────────────────────────────────────────────────

export function useAnalyticsSummary(month: string) {
  return useQuery({
    queryKey: ['analytics', 'summary', month],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/summary?month=${month}`)
      if (!res.ok) throw new Error('Failed to fetch summary')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useAnalyticsTrends(months = 6) {
  return useQuery({
    queryKey: ['analytics', 'trends', months],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/trends?months=${months}`)
      if (!res.ok) throw new Error('Failed to fetch trends')
      return res.json()
    },
    staleTime: 1000 * 60 * 10,
  })
}

// ── Budgets ───────────────────────────────────────────────────────────────

export function useBudgets(month: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: async () => {
      const res = await fetch(`/api/budgets?month=${month}`)
      if (!res.ok) throw new Error('Failed to fetch budgets')
      return res.json()
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useBudgetStatus(month: string) {
  return useQuery({
    queryKey: ['budgets', 'status', month],
    queryFn: async () => {
      const res = await fetch(`/api/budgets/status?month=${month}`)
      if (!res.ok) throw new Error('Failed to fetch budget status')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { categoryId: string; month: string; amount: number }) => {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save budget')
      return res.json()
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      toast.success(vars.amount === 0 ? 'Budget cleared' : 'Budget saved')
    },
    onError: () => toast.error('Failed to save budget'),
  })
}

// ── Insights ──────────────────────────────────────────────────────────────

export function useInsights(month: string) {
  return useQuery({
    queryKey: ['insights', month],
    queryFn: async () => {
      const res = await fetch(`/api/insights?month=${month}`)
      if (!res.ok) throw new Error('Failed to fetch insights')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ── Predictions ───────────────────────────────────────────────────────────

export function usePrediction(month: string) {
  return useQuery({
    queryKey: ['predictions', 'month-end', month],
    queryFn: async () => {
      const res = await fetch(`/api/predictions/month-end?month=${month}`)
      if (!res.ok) throw new Error('Failed to fetch prediction')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

// ── Categories ────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) throw new Error('Failed to fetch categories')
      return res.json()
    },
    staleTime: 1000 * 60 * 60, // 1 hour — categories rarely change
  })
}

export function useSeedCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/categories', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to seed categories')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategoryGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, group }: { id: string; group: string | null }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group }),
      })
      if (!res.ok) throw new Error('Failed to update group')
      return res.json()
    },
    onSuccess: (_, { group }) => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success(group ? `Moved to "${group}"` : 'Removed from bucket')
    },
    onError: () => toast.error('Failed to update bucket'),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string
      type?: string
      group?: string | null
      name?: string
      color?: string
      icon?: string | null
      isFixed?: boolean
    }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update category')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
    },
    onError: () => toast.error('Failed to update category'),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; type: string; color: string; icon?: string; isFixed?: boolean }) => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create category')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category created')
    },
    onError: () => toast.error('Failed to create category'),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete category')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Category deleted')
    },
    onError: () => toast.error('Failed to delete category'),
  })
}
