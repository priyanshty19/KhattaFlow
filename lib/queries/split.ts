import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  CreateGroupInput,
  InviteMemberInput,
  CreateExpenseInput,
  CreateSettlementInput,
  CreateCycleInput,
  UpsertContributionInput,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
} from '@/lib/validations/split'

export const splitKeys = {
  all: ['split'] as const,
  groups: () => [...splitKeys.all, 'groups'] as const,
  group: (id: string) => [...splitKeys.all, 'group', id] as const,
  cycles: (id: string) => [...splitKeys.all, 'group', id, 'cycles'] as const,
  inventory: (id: string) => [...splitKeys.all, 'group', id, 'inventory'] as const,
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ? JSON.stringify(body.error) : 'Request failed')
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SplitGroupSummary {
  id: string
  name: string
  type: 'personal' | 'business'
  currency: string
  memberCount: number
  members: { id: string; name: string; status: string }[]
  myNet: number
  expenseCount: number
  lastActivity: string
}

export interface SplitMemberDTO {
  id: string
  name: string
  email: string | null
  status: string
  role: string
  userId: string | null
}

export interface SplitExpenseDTO {
  id: string
  description: string
  amount: number
  paidById: string
  paidByName: string
  category: string | null
  date: string
  splitType: 'equal' | 'exact' | 'percentage' | 'shares'
  notes: string | null
  cycleId: string | null
  createdAt: string
  shares: { memberId: string; amount: number }[]
}

export interface BalanceDTO {
  memberId: string
  paid: number
  owed: number
  net: number
}

export interface TransferDTO {
  fromMemberId: string
  toMemberId: string
  amount: number
}

export interface SettlementDTO {
  id: string
  fromMemberId: string
  toMemberId: string
  amount: number
  isSettled: boolean
  settledAt: string | null
  note: string | null
  createdAt: string
}

export interface SplitGroupDetail {
  id: string
  name: string
  type: 'personal' | 'business'
  currency: string
  createdById: string
  myMemberId: string
  myRole: string
  members: SplitMemberDTO[]
  expenses: SplitExpenseDTO[]
  balances: BalanceDTO[]
  suggestions: TransferDTO[]
  settlements: SettlementDTO[]
}

export interface CycleDTO {
  id: string
  name: string
  startDate: string
  endDate: string
  totalBudget: number
  status: string
  spent: number
  contributed: number
  contributions: {
    id: string
    memberId: string
    requiredAmount: number
    paidAmount: number
    status: string
  }[]
}

export interface InventoryItemDTO {
  id: string
  name: string
  quantity: number
  unitCost: number
  category: string | null
  notes: string | null
  cycleId: string | null
  createdAt: string
}

// ── Groups ───────────────────────────────────────────────────────────────────

export function useSplitGroups() {
  return useQuery({
    queryKey: splitKeys.groups(),
    queryFn: () => fetch('/api/split/groups').then((r) => json<{ groups: SplitGroupSummary[] }>(r)),
    staleTime: 1000 * 30,
  })
}

export function useSplitGroup(id: string) {
  return useQuery({
    queryKey: splitKeys.group(id),
    queryFn: () => fetch(`/api/split/groups/${id}`).then((r) => json<SplitGroupDetail>(r)),
    enabled: !!id,
    staleTime: 1000 * 15,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupInput) =>
      fetch('/api/split/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
        (r) => json<{ id: string }>(r),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.groups() })
      toast.success('Group created')
    },
    onError: () => toast.error('Failed to create group'),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/split/groups/${id}`, { method: 'DELETE' }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.groups() })
      toast.success('Group deleted')
    },
    onError: () => toast.error('Failed to delete group'),
  })
}

// ── Members / invites ─────────────────────────────────────────────────────────

export function useInviteMember(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: InviteMemberInput) =>
      fetch(`/api/split/groups/${groupId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(
        (r) => json<{ memberId: string; inviteUrl: string }>(r),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.group(groupId) })
      toast.success('Invite sent')
    },
    onError: () => toast.error('Failed to invite'),
  })
}

// Fetch a shareable invite link for a pending member on demand (e.g. to copy it).
export function useMemberInviteLink(groupId: string) {
  return useMutation({
    mutationFn: (memberId: string) =>
      fetch(`/api/split/groups/${groupId}/members/${memberId}/invite-link`).then((r) =>
        json<{ inviteUrl: string }>(r),
      ),
    onError: () => toast.error('Could not get invite link'),
  })
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) =>
      fetch(`/api/split/groups/${groupId}/members/${memberId}`, { method: 'DELETE' }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.group(groupId) })
      toast.success('Member removed')
    },
    onError: (e: Error) => toast.error(e.message?.includes('history') ? 'Member has expense history' : 'Failed to remove member'),
  })
}

// ── Expenses ───────────────────────────────────────────────────────────────────

export function useAddExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      fetch(`/api/split/groups/${groupId}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.group(groupId) })
      qc.invalidateQueries({ queryKey: splitKeys.cycles(groupId) })
      qc.invalidateQueries({ queryKey: splitKeys.groups() })
      toast.success('Expense added')
    },
    onError: () => toast.error('Failed to add expense'),
  })
}

export function useUpdateExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: string; data: CreateExpenseInput }) =>
      fetch(`/api/split/groups/${groupId}/expenses/${expenseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.group(groupId) })
      toast.success('Expense updated')
    },
    onError: () => toast.error('Failed to update expense'),
  })
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (expenseId: string) =>
      fetch(`/api/split/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.group(groupId) })
      qc.invalidateQueries({ queryKey: splitKeys.groups() })
      toast.success('Expense deleted')
    },
    onError: () => toast.error('Failed to delete expense'),
  })
}

// ── Settlements ───────────────────────────────────────────────────────────────

export function useRecordSettlement(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSettlementInput) =>
      fetch(`/api/split/groups/${groupId}/settlements`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.group(groupId) })
      qc.invalidateQueries({ queryKey: splitKeys.groups() })
      toast.success('Settlement recorded')
    },
    onError: () => toast.error('Failed to record settlement'),
  })
}

// ── Business cycles + contributions ─────────────────────────────────────────────

export function useCycles(groupId: string) {
  return useQuery({
    queryKey: splitKeys.cycles(groupId),
    queryFn: () => fetch(`/api/split/groups/${groupId}/cycles`).then((r) => json<{ cycles: CycleDTO[] }>(r)),
    enabled: !!groupId,
    staleTime: 1000 * 30,
  })
}

export function useCreateCycle(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCycleInput) =>
      fetch(`/api/split/groups/${groupId}/cycles`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.cycles(groupId) })
      toast.success('Cycle created')
    },
    onError: () => toast.error('Failed to create cycle'),
  })
}

export function useRecomputeObligations(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cycleId: string) =>
      fetch(`/api/split/groups/${groupId}/cycles/${cycleId}/contributions`, { method: 'POST' }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.cycles(groupId) })
      toast.success('Shares recomputed')
    },
    onError: () => toast.error('Failed to recompute shares'),
  })
}

export function useUpsertContribution(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cycleId, data }: { cycleId: string; data: UpsertContributionInput }) =>
      fetch(`/api/split/groups/${groupId}/cycles/${cycleId}/contributions`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.cycles(groupId) })
      toast.success('Contribution updated')
    },
    onError: () => toast.error('Failed to update contribution'),
  })
}

// ── Business inventory ──────────────────────────────────────────────────────────

export function useInventory(groupId: string) {
  return useQuery({
    queryKey: splitKeys.inventory(groupId),
    queryFn: () => fetch(`/api/split/groups/${groupId}/inventory`).then((r) => json<{ items: InventoryItemDTO[] }>(r)),
    enabled: !!groupId,
    staleTime: 1000 * 30,
  })
}

export function useAddInventoryItem(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInventoryItemInput) =>
      fetch(`/api/split/groups/${groupId}/inventory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.inventory(groupId) })
      toast.success('Item added')
    },
    onError: () => toast.error('Failed to add item'),
  })
}

export function useUpdateInventoryItem(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateInventoryItemInput }) =>
      fetch(`/api/split/groups/${groupId}/inventory/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.inventory(groupId) })
      toast.success('Item updated')
    },
    onError: () => toast.error('Failed to update item'),
  })
}

export function useDeleteInventoryItem(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) =>
      fetch(`/api/split/groups/${groupId}/inventory/${itemId}`, { method: 'DELETE' }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: splitKeys.inventory(groupId) })
      toast.success('Item deleted')
    },
    onError: () => toast.error('Failed to delete item'),
  })
}
