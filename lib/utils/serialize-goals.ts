// lib/utils/serialize-goals.ts
// Goal/allocation monetary columns are Prisma BigInt (paise can exceed INT4 max).
// Prisma returns JS `bigint`, which JSON.stringify cannot serialize and the
// number-based goals engine cannot consume — so convert to Number at the DB
// boundary. JS numbers safely hold integers up to 2^53 (≈ ₹90 trillion).

export function serializeGoal<T extends { targetAmount: bigint }>(g: T): Omit<T, 'targetAmount'> & { targetAmount: number } {
  return { ...g, targetAmount: Number(g.targetAmount) }
}

export function serializeAllocation<T extends { monthlyAmount: bigint; currentValue: bigint }>(
  a: T,
): Omit<T, 'monthlyAmount' | 'currentValue'> & { monthlyAmount: number; currentValue: number } {
  return { ...a, monthlyAmount: Number(a.monthlyAmount), currentValue: Number(a.currentValue) }
}
