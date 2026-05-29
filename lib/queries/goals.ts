import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CreateGoalInput, UpdateGoalInput, UpsertAllocationsInput } from '@/lib/validations/goal'

export const goalKeys = {
  all: ['goals'] as const,
  list: () => [...goalKeys.all, 'list'] as const,
  allocations: () => [...goalKeys.all, 'allocations'] as const,
  plan: () => [...goalKeys.all, 'plan'] as const,
  recommendations: () => [...goalKeys.all, 'recommendations'] as const,
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ? JSON.stringify(body.error) : 'Request failed')
  }
  return res.json()
}

// ── Goals ────────────────────────────────────────────────────────────────────

export function useGoals() {
  return useQuery({
    queryKey: goalKeys.list(),
    queryFn: () => fetch('/api/goals').then((r) => json<any[]>(r)),
    staleTime: 1000 * 60,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGoalInput) =>
      fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all })
      toast.success('Goal added')
    },
    onError: () => toast.error('Failed to add goal'),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      fetch(`/api/goals/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all })
      toast.success('Goal updated')
    },
    onError: () => toast.error('Failed to update goal'),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fetch(`/api/goals/${id}`, { method: 'DELETE' }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.all })
      toast.success('Goal removed')
    },
    onError: () => toast.error('Failed to remove goal'),
  })
}

// ── Allocations ────────────────────────────────────────────────────────────

export function useAllocations() {
  return useQuery({
    queryKey: goalKeys.allocations(),
    queryFn: () => fetch('/api/goals/allocations').then((r) => json<any[]>(r)),
    staleTime: 1000 * 60,
  })
}

export function useUpsertAllocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertAllocationsInput) =>
      fetch('/api/goals/allocations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(json),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: goalKeys.allocations() })
      qc.invalidateQueries({ queryKey: goalKeys.plan() })
      qc.invalidateQueries({ queryKey: goalKeys.recommendations() })
      toast.success('Investments saved')
    },
    onError: () => toast.error('Failed to save investments'),
  })
}

// ── Plan ───────────────────────────────────────────────────────────────────

export interface GoalPlanResponse {
  style: 'conservative' | 'balanced' | 'aggressive'
  summary: {
    monthlyInvesting: number
    existingCorpus: number
    blendedReturn: number
    goalsTotal: number
    onTrack: number
  }
  goals: Array<{
    goalId?: string
    name: string
    target: number
    projected: number
    gapPct: number
    status: 'on_track' | 'behind' | 'ahead'
    monthsRemaining: number
    monthlyInvesting: number
    requiredMonthly: number
    shortfallMonthly: number
    targetDate: string
    series: { month: number; value: number }[]
  }>
  suggestions: Array<{
    vehicle: string
    action: 'increase' | 'decrease' | 'maintain'
    currentShare: number
    targetShare: number
    deltaMonthly: number
    reason: string
  }>
}

export function useGoalPlan() {
  return useQuery({
    queryKey: goalKeys.plan(),
    queryFn: () => fetch('/api/goals/plan').then((r) => json<GoalPlanResponse>(r)),
    staleTime: 1000 * 30,
  })
}

// ── AI recommendations (goal-aware, Gemini-backed) ───────────────────────────

export interface GoalRecommendation {
  id: string
  title: string
  body: string
  category: 'allocation' | 'contribution' | 'goal' | 'risk' | 'tip'
  impact: 'high' | 'medium' | 'low'
}

export interface GoalRecommendationsResponse {
  source: 'ai' | 'rules'
  recommendations: GoalRecommendation[]
}

export function useGoalRecommendations(enabled = true) {
  return useQuery({
    queryKey: goalKeys.recommendations(),
    queryFn: () => fetch('/api/goals/recommendations').then((r) => json<GoalRecommendationsResponse>(r)),
    enabled,
    staleTime: 1000 * 60 * 5, // AI calls are costly — cache 5 min
    retry: false,
  })
}
