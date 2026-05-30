// lib/engines/split-engine.ts
// Pure, unit-testable expense-splitting + settlement logic for Split & Share.
// All monetary values are in paise (integers). Adapted from the Mecako settlement engine.

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares'

/** Per-member input for non-equal splits. value semantics depend on splitType:
 *  exact → paise owed; percentage → 0–100; shares → relative weight (any positive number). */
export interface ShareInput {
  memberId: string
  value?: number
}

export interface ComputedShare {
  memberId: string
  amount: number // paise owed by this member
}

export interface Balance {
  memberId: string
  paid: number // total paise this member paid
  owed: number // total paise this member's share across expenses
  net: number // paid - owed (positive = is owed money, negative = owes)
}

export interface Transfer {
  fromMemberId: string
  toMemberId: string
  amount: number // paise
}

// ── Internal helpers ───────────────────────────────────────────────────────

/** Adjust a set of shares so they sum exactly to `amount`, absorbing any rounding
 *  remainder into the payer's share (or the first share if the payer isn't included). */
function absorbRemainder(shares: ComputedShare[], amount: number, payerId: string): ComputedShare[] {
  if (!shares.length) return shares
  const sum = shares.reduce((s, x) => s + x.amount, 0)
  const diff = amount - sum
  if (diff === 0) return shares
  const targetId = shares.some((s) => s.memberId === payerId) ? payerId : shares[0].memberId
  return shares.map((s) => (s.memberId === targetId ? { ...s, amount: s.amount + diff } : s))
}

// ── Share computation ──────────────────────────────────────────────────────

/**
 * Split an expense `amount` among `participants` according to `splitType`.
 * The result always sums exactly to `amount` (rounding remainder → payer).
 */
export function computeShares(params: {
  amount: number
  splitType: SplitType
  participants: string[] // member IDs included in this split
  payerId: string // member who paid (absorbs rounding remainder)
  inputs?: ShareInput[] // required for exact / percentage / shares
}): ComputedShare[] {
  const { amount, splitType, participants, payerId, inputs = [] } = params
  if (amount < 0) throw new Error('amount must be non-negative')
  if (!participants.length) return []

  const inputFor = (memberId: string) => inputs.find((i) => i.memberId === memberId)?.value ?? 0

  switch (splitType) {
    case 'equal': {
      const n = participants.length
      const base = Math.floor(amount / n)
      const shares = participants.map((memberId) => ({ memberId, amount: base }))
      return absorbRemainder(shares, amount, payerId)
    }

    case 'exact': {
      const shares = participants.map((memberId) => ({ memberId, amount: Math.round(inputFor(memberId)) }))
      // exact inputs should already sum to amount; absorb any operator discrepancy into payer
      return absorbRemainder(shares, amount, payerId)
    }

    case 'percentage': {
      const shares = participants.map((memberId) => ({
        memberId,
        amount: Math.round((amount * inputFor(memberId)) / 100),
      }))
      return absorbRemainder(shares, amount, payerId)
    }

    case 'shares': {
      const totalWeight = participants.reduce((s, m) => s + Math.max(0, inputFor(m)), 0)
      if (totalWeight <= 0) {
        // fall back to equal when no weights provided
        return computeShares({ amount, splitType: 'equal', participants, payerId })
      }
      const shares = participants.map((memberId) => ({
        memberId,
        amount: Math.round((amount * Math.max(0, inputFor(memberId))) / totalWeight),
      }))
      return absorbRemainder(shares, amount, payerId)
    }

    default:
      throw new Error(`unknown splitType: ${splitType as string}`)
  }
}

// ── Balances ─────────────────────────────────────────────────────────────────

export interface ExpenseForBalance {
  paidById: string
  shares: { memberId: string; amount: number }[]
}

/**
 * Net balance per member across all expenses.
 * net = total paid − total owed. Positive = the group owes them; negative = they owe.
 * Includes every member that appears as a payer or in any share.
 */
export function computeBalances(expenses: ExpenseForBalance[]): Balance[] {
  const paid = new Map<string, number>()
  const owed = new Map<string, number>()
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)

  for (const e of expenses) {
    const total = e.shares.reduce((s, x) => s + x.amount, 0)
    add(paid, e.paidById, total)
    for (const sh of e.shares) add(owed, sh.memberId, sh.amount)
  }

  const memberIds = new Set<string>([...Array.from(paid.keys()), ...Array.from(owed.keys())])
  return Array.from(memberIds).map((memberId) => {
    const p = paid.get(memberId) ?? 0
    const o = owed.get(memberId) ?? 0
    return { memberId, paid: p, owed: o, net: p - o }
  })
}

/**
 * Apply recorded (settled) cash transfers to a set of balances so the result
 * reflects the *outstanding* position. A settled transfer of `amount` from
 * debtor → creditor reduces the debtor's debt (net goes up) and the creditor's
 * credit (net goes down). `paid`/`owed` are left as the gross expense figures.
 *
 * This keeps the displayed balances consistent with `minimizeSettlements`,
 * which is also computed net of recorded settlements.
 */
export function applySettlements(
  balances: Balance[],
  settlements: { fromMemberId: string; toMemberId: string; amount: number }[],
): Balance[] {
  const netByMember = new Map<string, number>()
  for (const b of balances) netByMember.set(b.memberId, b.net)
  for (const s of settlements) {
    netByMember.set(s.fromMemberId, (netByMember.get(s.fromMemberId) ?? 0) + s.amount)
    netByMember.set(s.toMemberId, (netByMember.get(s.toMemberId) ?? 0) - s.amount)
  }
  return balances.map((b) => ({ ...b, net: netByMember.get(b.memberId) ?? b.net }))
}

// ── Settlement minimization ──────────────────────────────────────────────────

/**
 * Greedy minimum-transfer settlement: repeatedly match the largest debtor to the
 * largest creditor and settle min(debt, credit) until everyone nets to ~0.
 * Produces at most (n−1) transfers.
 */
export function minimizeSettlements(balances: { memberId: string; net: number }[]): Transfer[] {
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ memberId: b.memberId, amount: b.net }))
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ memberId: b.memberId, amount: -b.net }))

  const transfers: Transfer[] = []
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.amount - a.amount)
    debtors.sort((a, b) => b.amount - a.amount)
    const c = creditors[0]
    const d = debtors[0]
    const amount = Math.min(c.amount, d.amount)
    if (amount > 0) transfers.push({ fromMemberId: d.memberId, toMemberId: c.memberId, amount })
    c.amount -= amount
    d.amount -= amount
    if (c.amount <= 0) creditors.shift()
    if (d.amount <= 0) debtors.shift()
  }
  return transfers
}

/**
 * Direct (un-simplified) settlements: who owes whom based on the *actual* expense
 * shares, rather than the minimized transfer set. For each expense, every
 * non-payer participant owes the payer their share. Reciprocal pairs are netted
 * (if A owes B and B owes A, only the difference remains), and any recorded
 * settlements are applied per direction. Used when a group disables "simplify debts".
 */
export function computeDirectSettlements(
  expenses: ExpenseForBalance[],
  settlements: { fromMemberId: string; toMemberId: string; amount: number }[] = [],
): Transfer[] {
  // Aggregate raw debts: key `${from}|${to}` → amount the `from` member owes `to`.
  const debts = new Map<string, number>()
  const add = (from: string, to: string, amount: number) => {
    if (from === to || amount <= 0) return
    const key = `${from}|${to}`
    debts.set(key, (debts.get(key) ?? 0) + amount)
  }

  for (const e of expenses) {
    for (const sh of e.shares) add(sh.memberId, e.paidById, sh.amount)
  }
  // Apply recorded settlements: a payment from→to pays *down* the from→to debt,
  // so it counts as a credit in the reverse direction during netting.
  for (const s of settlements) add(s.toMemberId, s.fromMemberId, s.amount)

  // Net reciprocal pairs so we never show both A→B and B→A.
  const net = new Map<string, number>() // key uses the from→to of the surviving direction
  const seen = new Set<string>()
  for (const [key, amount] of Array.from(debts.entries())) {
    if (seen.has(key)) continue
    const [from, to] = key.split('|')
    const reverseKey = `${to}|${from}`
    const reverse = debts.get(reverseKey) ?? 0
    seen.add(key)
    seen.add(reverseKey)
    const diff = amount - reverse
    if (diff > 0) net.set(key, diff)
    else if (diff < 0) net.set(reverseKey, -diff)
  }

  return Array.from(net.entries())
    .map(([key, amount]) => {
      const [fromMemberId, toMemberId] = key.split('|')
      return { fromMemberId, toMemberId, amount }
    })
    .filter((t) => t.amount > 0)
}

// ── Business pooled-budget helpers ─────────────────────────────────────────────

export type ContributionStatus = 'pending' | 'partial' | 'complete' | 'overdue'

/**
 * Equal fair-share obligation per member of a pooled total (cycle budget/expenses).
 * Remainder paise are distributed one-per-member to the leading members so the
 * obligations sum exactly to `totalAmount`.
 */
export function poolObligations(params: {
  totalAmount: number
  memberIds: string[]
}): { memberId: string; requiredAmount: number }[] {
  const { totalAmount, memberIds } = params
  const n = memberIds.length
  if (n === 0) return []
  const base = Math.floor(totalAmount / n)
  let remainder = totalAmount - base * n
  return memberIds.map((memberId) => {
    const extra = remainder > 0 ? 1 : 0
    if (remainder > 0) remainder -= 1
    return { memberId, requiredAmount: base + extra }
  })
}

/** Status of a member's contribution given required vs paid and an optional due date. */
export function computeContributionStatus(params: {
  requiredAmount: number
  paidAmount: number
  dueDate?: string | Date | null
  now?: Date
}): ContributionStatus {
  const { requiredAmount, paidAmount, dueDate, now = new Date() } = params
  if (requiredAmount > 0 && paidAmount >= requiredAmount) return 'complete'
  const past = dueDate ? now > new Date(dueDate) : false
  if (past) return 'overdue'
  if (paidAmount <= 0) return 'pending'
  return 'partial'
}
