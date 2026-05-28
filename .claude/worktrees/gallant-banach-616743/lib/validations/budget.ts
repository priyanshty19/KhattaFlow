import { z } from 'zod'

export const upsertBudgetSchema = z.object({
  categoryId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().int().min(0), // paise; 0 = delete
})

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>
