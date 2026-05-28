import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateTransactionInput } from '@/lib/validations/transaction'

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: Record<string, unknown>) => [...transactionKeys.all, 'list', filters] as const,
  month: (month: string) => [...transactionKeys.all, 'month', month] as const,
}

async function fetchTransactions(params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v && query.set(k, v))
  const res = await fetch(`/api/transactions?${query}`)
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

async function createTransaction(data: CreateTransactionInput) {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}

async function updateTransaction(id: string, data: Partial<CreateTransactionInput>) {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error('[updateTransaction] failed', res.status, body)
    throw new Error(JSON.stringify(body))
  }
  return res.json()
}

async function deleteTransaction(id: string) {
  const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete transaction')
  return res.json()
}

export function useTransactionsByCategory(categoryId: string, month: string) {
  return useQuery({
    queryKey: transactionKeys.list({ categoryId, month }),
    queryFn: () => fetchTransactions({ categoryId, month, limit: '100' }),
    staleTime: 1000 * 60 * 2,
    enabled: !!categoryId,
  })
}

export function useTransactions(params: Record<string, string | undefined>) {
  return useQuery({
    queryKey: transactionKeys.list(params),
    queryFn: () => fetchTransactions(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['budgets', 'status'] })
      qc.invalidateQueries({ queryKey: ['predictions'] })
      toast.success('Transaction added')
    },
    onError: () => toast.error('Failed to add transaction'),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionInput> }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['budgets', 'status'] })
      toast.success('Transaction updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update transaction'),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.all })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['insights'] })
      qc.invalidateQueries({ queryKey: ['budgets'] })
      qc.invalidateQueries({ queryKey: ['budgets', 'status'] })
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete transaction'),
  })
}
