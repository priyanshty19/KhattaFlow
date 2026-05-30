import { z } from 'zod'

// ── Group ────────────────────────────────────────────────────────────────────

export const splitGroupTypeSchema = z.enum(['personal', 'business'])

export const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  type: splitGroupTypeSchema,
  currency: z.string().min(1).max(8).optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  simplifyDebts: z.boolean().optional(),
})

// ── Members / invites ────────────────────────────────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80).optional(),
})

export const updateMemberSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.enum(['owner', 'member']).optional(),
})

// ── Expenses ───────────────────────────────────────────────────────────────────

export const splitTypeSchema = z.enum(['equal', 'exact', 'percentage', 'shares'])

const shareInputSchema = z.object({
  memberId: z.string().min(1),
  value: z.number().min(0).optional(), // exact: paise; percentage: 0–100; shares: weight
})

export const createExpenseSchema = z
  .object({
    description: z.string().min(1).max(120),
    amount: z.number().int().positive(), // paise
    paidById: z.string().min(1), // SplitMember id
    splitType: splitTypeSchema,
    participants: z.array(z.string().min(1)).min(1), // SplitMember ids included in the split
    inputs: z.array(shareInputSchema).optional(),
    category: z.string().max(40).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    notes: z.string().max(500).optional(),
    cycleId: z.string().optional(),
  })
  .refine((d) => (d.splitType === 'equal' ? true : !!d.inputs?.length), {
    message: 'inputs required for non-equal split types',
    path: ['inputs'],
  })

export const updateExpenseSchema = createExpenseSchema

// ── Settlements ───────────────────────────────────────────────────────────────

export const createSettlementSchema = z.object({
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amount: z.number().int().positive(),
  note: z.string().max(200).optional(),
})

export const updateSettlementSchema = z.object({
  isSettled: z.boolean().optional(),
  note: z.string().max(200).optional(),
})

// ── Business: cycles & contributions ───────────────────────────────────────────

const cycleAllocationSchema = z.object({
  category: z.string().min(1).max(40),
  amount: z.number().int().min(0),
})

export const createCycleSchema = z.object({
  name: z.string().min(1).max(80),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalBudget: z.number().int().min(0).optional(),
  bufferAmount: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
  allocations: z.array(cycleAllocationSchema).optional(),
  status: z.enum(['draft', 'active', 'completed']).optional(),
})

export const updateCycleSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  totalBudget: z.number().int().min(0).optional(),
  bufferAmount: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
  allocations: z.array(cycleAllocationSchema).optional(),
  status: z.enum(['draft', 'active', 'completed']).optional(),
})

export const upsertContributionSchema = z.object({
  memberId: z.string().min(1),
  requiredAmount: z.number().int().min(0).optional(),
  paidAmount: z.number().int().min(0).optional(),
})

// ── Business: inventory ─────────────────────────────────────────────────────────

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.number().int().min(0),
  unitCost: z.number().int().min(0), // paise per unit
  category: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
  cycleId: z.string().optional(),
})

export const updateInventoryItemSchema = createInventoryItemSchema.partial()

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>
export type UpdateSettlementInput = z.infer<typeof updateSettlementSchema>
export type CreateCycleInput = z.infer<typeof createCycleSchema>
export type UpdateCycleInput = z.infer<typeof updateCycleSchema>
export type UpsertContributionInput = z.infer<typeof upsertContributionSchema>
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>
