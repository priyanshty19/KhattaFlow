import { z } from 'zod'

export const createTransactionSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().int().positive(), // paise
  type: z.enum(['income', 'expense', 'investment', 'savings']),
  paymentMethod: z.enum(['cash', 'credit_card', 'upi', 'bank_transfer', 'auto_debit']).optional(),
  description: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const listTransactionsSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(['income', 'expense', 'investment', 'savings']).optional(),
  categoryId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>
