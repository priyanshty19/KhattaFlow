import { z } from 'zod'
import { ALL_VEHICLES } from '@/constants/investment-returns'

export const createGoalSchema = z.object({
  name: z.string().min(1).max(80),
  targetAmount: z.number().int().positive(), // paise
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  priority: z.number().int().min(0).optional(),
})

export const updateGoalSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  targetAmount: z.number().int().positive().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.number().int().min(0).optional(),
  status: z.enum(['active', 'achieved', 'paused']).optional(),
})

const allocationItem = z.object({
  vehicle: z.enum(ALL_VEHICLES as [string, ...string[]]),
  monthlyAmount: z.number().int().min(0), // paise/month
  currentValue: z.number().int().min(0).optional(),
  label: z.string().max(40).optional(),
})

// PUT: full replace of the user's allocation set
export const upsertAllocationsSchema = z.object({
  allocations: z.array(allocationItem),
})

export type CreateGoalInput = z.infer<typeof createGoalSchema>
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>
export type UpsertAllocationsInput = z.infer<typeof upsertAllocationsSchema>
