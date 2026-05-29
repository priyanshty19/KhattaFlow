export const dynamic = 'force-dynamic'
// app/api/goals/recommendations/route.ts
// Goal-AWARE AI recommendations (distinct from the deterministic mix optimizer in /plan).
// Loads goals + allocations + style, computes the projection picture, then asks Gemini for
// the top 4 prioritized actions that consider BOTH goal shortfalls and allocation mix.
// Falls back to a rule-based synthesis if Gemini is unavailable.
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'
import {
  evaluateGoal,
  optimizeAllocations,
  monthlyTotal,
  existingCorpus,
  blendedReturn,
  type Allocation,
  type GoalEvaluation,
  type OptimizerSuggestion,
} from '@/lib/engines/goals-engine'
import { VEHICLES, TARGET_MIX, DEFAULT_STYLE, type Vehicle } from '@/constants/investment-returns'
import type { InvestmentStyle } from '@/constants/categories'

export interface GoalRecommendation {
  id: string
  title: string
  body: string
  category: 'allocation' | 'contribution' | 'goal' | 'risk' | 'tip'
  impact: 'high' | 'medium' | 'low'
}

const toRs = (paise: number) => (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const pct = (x: number) => `${(x * 100).toFixed(0)}%`

const VALID_CATEGORIES = ['allocation', 'contribution', 'goal', 'risk', 'tip']
const VALID_IMPACT = ['high', 'medium', 'low']

async function generateWithGemini(ctx: {
  style: InvestmentStyle
  monthlyInvesting: number
  existingCorpus: number
  blendedReturn: number
  evaluations: GoalEvaluation[]
  suggestions: OptimizerSuggestion[]
  mix: { vehicle: Vehicle; share: number; monthly: number }[]
}): Promise<GoalRecommendation[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const goalsBlock = ctx.evaluations.length
    ? ctx.evaluations
        .map(
          (g) =>
            `- ${g.name}: target ₹${toRs(g.target)} in ${g.monthsRemaining} months; projected ₹${toRs(
              g.projected,
            )} (${g.status}, ${(g.gapPct * 100).toFixed(0)}%); needs ₹${toRs(g.requiredMonthly)}/mo, currently funding ₹${toRs(
              g.monthlyInvesting,
            )}/mo${g.shortfallMonthly > 0 ? `, shortfall ₹${toRs(g.shortfallMonthly)}/mo` : ''}`,
        )
        .join('\n')
    : '- (no goals set yet)'

  const mixBlock = ctx.mix.length
    ? ctx.mix.map((m) => `- ${VEHICLES[m.vehicle].label}: ${pct(m.share)} (₹${toRs(m.monthly)}/mo)`).join('\n')
    : '- (no investments recorded)'

  const targetMix = TARGET_MIX[ctx.style]
  const targetBlock = (Object.keys(targetMix) as Vehicle[])
    .map((v) => `${VEHICLES[v].label} ${pct(targetMix[v] ?? 0)}`)
    .join(', ')

  const prompt = `You are a sharp, direct financial planning advisor for an Indian investor. Based on their goals and investment mix, return ONLY a JSON array of exactly 4 prioritized recommendations. No markdown, no preamble — just the JSON array.

INVESTOR PROFILE: ${ctx.style} risk profile
Monthly investing: ₹${toRs(ctx.monthlyInvesting)} | Existing corpus: ₹${toRs(ctx.existingCorpus)} | Blended return: ${ctx.blendedReturn ? (ctx.blendedReturn * 100).toFixed(1) : '0'}% p.a.

GOALS:
${goalsBlock}

CURRENT MONTHLY MIX:
${mixBlock}

TARGET MIX FOR A ${ctx.style.toUpperCase()} PROFILE: ${targetBlock}

RULES:
- Consider BOTH whether goals are on track AND whether the allocation mix fits the profile.
- Prioritize the biggest lever first (e.g. a large monthly shortfall on a goal beats a minor mix drift).
- Be specific — quote the actual ₹ numbers and goal names from the data above.
- Each recommendation must be unique and non-redundant.
- category: "contribution" (change SIP amount), "allocation" (shift between vehicles), "goal" (adjust goal target/date/priority), "risk" (volatility/diversification), "tip" (general).
- impact: "high" | "medium" | "low".
- title: max 55 chars, action-oriented. body: 1-2 punchy sentences with numbers.
- Return EXACTLY this JSON shape (4 items, no extra fields):
[{"id":"slug","title":"...","body":"...","category":"contribution","impact":"high"}]`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
  })

  const result = await model.generateContent(prompt)
  const parsed = JSON.parse(result.response.text())
  if (!Array.isArray(parsed)) throw new Error('Gemini did not return an array')

  const valid: GoalRecommendation[] = parsed
    .filter((i: any) => i.id && i.title && i.body)
    .map((i: any) => ({
      id: String(i.id),
      title: String(i.title).slice(0, 80),
      body: String(i.body),
      category: VALID_CATEGORIES.includes(i.category) ? i.category : 'tip',
      impact: VALID_IMPACT.includes(i.impact) ? i.impact : 'medium',
    }))

  if (!valid.length) throw new Error('Gemini returned no usable recommendations')
  return valid.slice(0, 4)
}

/** Deterministic fallback synthesized from the engine output when Gemini is unavailable. */
function ruleBasedRecommendations(ctx: {
  evaluations: GoalEvaluation[]
  suggestions: OptimizerSuggestion[]
}): GoalRecommendation[] {
  const recs: GoalRecommendation[] = []

  // 1. Biggest goal shortfall → contribution
  const behind = [...ctx.evaluations]
    .filter((g) => g.shortfallMonthly > 0)
    .sort((a, b) => b.shortfallMonthly - a.shortfallMonthly)
  if (behind[0]) {
    const g = behind[0]
    recs.push({
      id: 'shortfall',
      title: `Top up “${g.name}” by ₹${toRs(g.shortfallMonthly)}/mo`,
      body: `You're projected to reach ₹${toRs(g.projected)} vs a ₹${toRs(g.target)} target. Raising your SIP by ₹${toRs(g.shortfallMonthly)}/mo closes the gap over ${g.monthsRemaining} months.`,
      category: 'contribution',
      impact: 'high',
    })
  }

  // 2. Top allocation suggestion
  const topMix = ctx.suggestions.find((s) => s.action !== 'maintain')
  if (topMix) {
    recs.push({
      id: 'mix',
      title: `${topMix.action === 'increase' ? 'Increase' : 'Reduce'} ${VEHICLES[topMix.vehicle].label}`,
      body: topMix.reason,
      category: topMix.vehicle === 'crypto' ? 'risk' : 'allocation',
      impact: 'medium',
    })
  }

  // 3. Ahead goal → reallocate or raise ambition
  const ahead = ctx.evaluations.find((g) => g.status === 'ahead')
  if (ahead) {
    recs.push({
      id: 'ahead',
      title: `“${ahead.name}” is ahead of target`,
      body: `Projected ₹${toRs(ahead.projected)} beats the ₹${toRs(ahead.target)} target. Consider redirecting some of this SIP toward goals that are behind.`,
      category: 'goal',
      impact: 'low',
    })
  }

  // 4. Diversification / next mix suggestion
  const secondMix = ctx.suggestions.filter((s) => s.action !== 'maintain')[1]
  if (secondMix) {
    recs.push({
      id: 'mix2',
      title: `${secondMix.action === 'increase' ? 'Add to' : 'Trim'} ${VEHICLES[secondMix.vehicle].label}`,
      body: secondMix.reason,
      category: secondMix.vehicle === 'crypto' ? 'risk' : 'allocation',
      impact: 'low',
    })
  }

  if (!recs.length) {
    recs.push({
      id: 'start',
      title: 'Add your goals and investments',
      body: 'Set a target and your monthly SIP to unlock a personalized plan and projections.',
      category: 'tip',
      impact: 'medium',
    })
  }

  return recs.slice(0, 4)
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user, goals, allocationRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { investmentStyle: true } }),
    prisma.financialGoal.findMany({ where: { userId, status: 'active' }, orderBy: [{ priority: 'asc' }, { targetDate: 'asc' }] }),
    prisma.investmentAllocation.findMany({ where: { userId } }),
  ])

  const style = ((user?.investmentStyle as InvestmentStyle) || DEFAULT_STYLE)
  const allocations: Allocation[] = allocationRows.map((a) => ({
    vehicle: a.vehicle as Vehicle,
    monthlyAmount: Number(a.monthlyAmount),
    currentValue: Number(a.currentValue),
  }))

  const evaluations = goals.map((g) =>
    evaluateGoal({ id: g.id, name: g.name, targetAmount: Number(g.targetAmount), targetDate: g.targetDate }, allocations),
  )
  const suggestions = optimizeAllocations(allocations, style)
  const total = monthlyTotal(allocations)
  const mix = allocations
    .filter((a) => a.monthlyAmount > 0)
    .map((a) => ({ vehicle: a.vehicle, share: total > 0 ? a.monthlyAmount / total : 0, monthly: a.monthlyAmount }))
    .sort((a, b) => b.monthly - a.monthly)

  const ctx = {
    style,
    monthlyInvesting: total,
    existingCorpus: existingCorpus(allocations),
    blendedReturn: blendedReturn(allocations),
    evaluations,
    suggestions,
    mix,
  }

  try {
    const recommendations = await generateWithGemini(ctx)
    return NextResponse.json({ source: 'ai', recommendations })
  } catch (err) {
    console.warn('[goals/recommendations] Gemini failed:', (err as Error).message)
    return NextResponse.json({ source: 'rules', recommendations: ruleBasedRecommendations(ctx) })
  }
}
