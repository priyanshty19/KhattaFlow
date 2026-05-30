export const dynamic = 'force-dynamic'
// app/api/insights/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InsightEngine, type Insight } from '@/lib/engines/insight-engine'
import { TransactionEngine } from '@/lib/engines/transaction-engine'
import { BudgetEngine } from '@/lib/engines/budget-engine'
import { getPreviousMonth } from '@/lib/utils/date'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { rateLimit, rateLimitKey } from '@/lib/utils/rate-limit'

const toRs = (paise: number) => (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })

async function generateWithGemini(
  current: { totalIncome: number; totalExpenses: number; totalSavings: number; totalInvestments: number },
  previous: { totalIncome: number; totalExpenses: number; totalSavings: number; totalInvestments: number },
  budgetStatuses: ReturnType<typeof BudgetEngine.computeBudgetStatus>,
  transactions: { paymentMethod: string | null; amount: number; type: string }[],
  savingsGoalPct: number,
  month: string
): Promise<Insight[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const savingsRate = current.totalIncome > 0
    ? ((current.totalSavings + current.totalInvestments) / current.totalIncome * 100).toFixed(1)
    : '0'
  const goalPct = (savingsGoalPct * 100).toFixed(0)
  const spendPct = current.totalIncome > 0
    ? (current.totalExpenses / current.totalIncome * 100).toFixed(1)
    : '0'

  const overBudget = budgetStatuses.filter(b => b.status === 'over')
  const nearBudget = budgetStatuses.filter(b => b.status === 'warning')

  const ccTotal = transactions
    .filter(t => t.paymentMethod === 'credit_card' && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const ccPct = current.totalExpenses > 0
    ? (ccTotal / current.totalExpenses * 100).toFixed(0)
    : '0'

  const prompt = `You are a sharp, direct personal finance advisor for an Indian user. Analyze their ${month} data and return ONLY a JSON array of 4-5 insights. No markdown, no explanation — just the JSON array.

FINANCIAL DATA:
Income: ₹${toRs(current.totalIncome)} | Expenses: ₹${toRs(current.totalExpenses)} (${spendPct}% of income)
Savings: ₹${toRs(current.totalSavings)} | Investments: ₹${toRs(current.totalInvestments)}
Savings rate: ${savingsRate}% (goal: ${goalPct}%)
Last month expenses: ₹${toRs(previous.totalExpenses)} | Last month income: ₹${toRs(previous.totalIncome)}
Credit card spend: ₹${toRs(ccTotal)} (${ccPct}% of expenses)
Over-budget categories: ${overBudget.length > 0 ? overBudget.map(b => `${b.categoryName} (${b.percentage.toFixed(0)}%)`).join(', ') : 'none'}
Near-budget categories (80-99%): ${nearBudget.length > 0 ? nearBudget.map(b => `${b.categoryName} (${b.percentage.toFixed(0)}%)`).join(', ') : 'none'}

RULES:
- Be specific — use the actual ₹ numbers from the data above
- Each insight must be unique and non-redundant
- severity: "success" (positive), "warning" (needs action), "info" (neutral), "tip" (suggestion)
- actionHref must be one of: /budgets, /transactions, /analytics (or omit)
- title: max 50 chars. body: 1-2 punchy sentences with numbers.
- Return exactly this JSON shape (no extra fields):
[{"id":"slug","title":"...","body":"...","severity":"success|warning|info|tip","actionLabel":"optional","actionHref":"optional"}]`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  })

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const parsed = JSON.parse(text)

  if (!Array.isArray(parsed)) throw new Error('Gemini did not return an array')

  // Validate + sanitise each insight
  const valid: Insight[] = parsed
    .filter((item: any) => item.id && item.title && item.body && item.severity)
    .map((item: any) => ({
      id: String(item.id),
      title: String(item.title).slice(0, 80),
      body: String(item.body),
      severity: ['success', 'warning', 'info', 'tip'].includes(item.severity) ? item.severity : 'info',
      ...(item.actionLabel ? { actionLabel: String(item.actionLabel) } : {}),
      ...(item.actionHref ? { actionHref: String(item.actionHref) } : {}),
    }))

  return valid.slice(0, 5)
}

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gemini cost guard — cap AI insight calls per user.
  const rl = rateLimit(rateLimitKey(req, 'insights', userId), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter ?? 60) } },
    )
  }

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 })

  const prevMonth = getPreviousMonth(month)

  const [currentSummary, previousSummary, budgets, transactions, user] = await Promise.all([
    prisma.monthlySummary.findUnique({ where: { userId_month: { userId, month } } }),
    prisma.monthlySummary.findUnique({ where: { userId_month: { userId, month: prevMonth } } }),
    prisma.budget.findMany({ where: { userId, month }, include: { category: true } }),
    prisma.transaction.findMany({ where: { userId, month, deletedAt: null }, include: { category: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { savingsGoalPct: true } }),
  ])

  if (!currentSummary) return NextResponse.json([])

  const categoryGroups = TransactionEngine.groupByCategory(transactions as any)
  const budgetStatuses = BudgetEngine.computeBudgetStatus(budgets as any, categoryGroups)
  const savingsGoalPct = user?.savingsGoalPct ?? 0.20

  const prev = previousSummary ?? { totalIncome: 0, totalExpenses: 0, totalSavings: 0, totalInvestments: 0 }

  // Try Gemini first, fall back to rule-based engine, final safety net returns []
  try {
    const insights = await generateWithGemini(
      currentSummary as any,
      prev,
      budgetStatuses,
      transactions as any,
      savingsGoalPct,
      month
    )
    return NextResponse.json(insights)
  } catch (geminiErr) {
    console.warn('[insights] Gemini failed:', (geminiErr as Error).message)
    try {
      const insights = InsightEngine.generate(
        currentSummary as any,
        prev as any,
        budgetStatuses,
        transactions as any,
        savingsGoalPct
      )
      return NextResponse.json(insights)
    } catch (engineErr) {
      console.error('[insights] Rule engine also failed:', engineErr)
      return NextResponse.json([])
    }
  }
}
