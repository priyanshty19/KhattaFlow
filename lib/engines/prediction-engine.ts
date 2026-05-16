// lib/engines/prediction-engine.ts

export type WarningLevel = 'deficit' | 'tight' | 'healthy'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface PredictionResult {
  projectedExpenses: number    // paise
  projectedBalance: number     // paise
  projectedSavingsRate: number // 0–100
  warningLevel: WarningLevel
  confidence: ConfidenceLevel
  daysRemaining: number
  dailyBurnRate: number        // paise per day
}

interface PredictionInput {
  currentExpenses: number      // paise
  currentIncome: number        // paise
  daysElapsed: number
  daysInMonth: number
  fixedCommitmentsRemaining: number  // paise
}

export class PredictionEngine {

  static predictMonthEnd(input: PredictionInput): PredictionResult {
    const { currentExpenses, currentIncome, daysElapsed, daysInMonth, fixedCommitmentsRemaining } = input

    const daysRemaining = daysInMonth - daysElapsed
    const dailyBurnRate = daysElapsed > 0 ? currentExpenses / daysElapsed : 0

    // Project variable spend for remaining days
    const projectedVariableSpend = dailyBurnRate * daysRemaining

    // Total projected = current + variable remainder + fixed still to come
    const projectedExpenses = currentExpenses + projectedVariableSpend + fixedCommitmentsRemaining
    const projectedBalance = currentIncome - projectedExpenses
    const projectedSavingsRate = currentIncome > 0
      ? Math.max(0, (projectedBalance / currentIncome) * 100)
      : 0

    return {
      projectedExpenses: Math.round(projectedExpenses),
      projectedBalance: Math.round(projectedBalance),
      projectedSavingsRate,
      warningLevel: this.getWarningLevel(projectedBalance),
      confidence: this.getConfidence(daysElapsed),
      daysRemaining,
      dailyBurnRate: Math.round(dailyBurnRate),
    }
  }

  private static getWarningLevel(projectedBalance: number): WarningLevel {
    if (projectedBalance < 0) return 'deficit'
    if (projectedBalance < 500000) return 'tight'  // less than ₹5,000
    return 'healthy'
  }

  private static getConfidence(daysElapsed: number): ConfidenceLevel {
    if (daysElapsed >= 20) return 'high'
    if (daysElapsed >= 10) return 'medium'
    return 'low'
  }
}
