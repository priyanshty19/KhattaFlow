export type WarningLevel = 'deficit' | 'tight' | 'healthy'
export type ConfidenceLevel = 'low' | 'medium' | 'high'

export interface PredictionResult {
  projectedExpenses: number    // paise — projected additional variable expenses
  projectedBalance: number     // paise — net balance at month end
  projectedSavingsRate: number // 0–100
  warningLevel: WarningLevel
  confidence: ConfidenceLevel
  daysRemaining: number
  dailyBurnRate: number        // paise per day (variable expenses only)
}

interface PredictionInput {
  currentNetBalance: number    // paise — income minus all outflows to date
  currentExpenses: number      // paise — variable expense transactions only
  totalIncome: number          // paise — for savings rate calculation
  daysElapsed: number
  daysInMonth: number
  fixedCommitmentsRemaining: number  // paise — unpaid fixed expense budgets
}

export class PredictionEngine {

  static predictMonthEnd(input: PredictionInput): PredictionResult {
    const { currentNetBalance, currentExpenses, totalIncome, daysElapsed, daysInMonth, fixedCommitmentsRemaining } = input

    const daysRemaining = daysInMonth - daysElapsed

    // Daily burn rate from variable expenses only (savings/investments are lump-sum, not daily)
    const dailyBurnRate = daysElapsed > 0 ? currentExpenses / daysElapsed : 0

    // Project remaining variable spend + any unpaid fixed commitments
    const projectedFutureSpend = (dailyBurnRate * daysRemaining) + fixedCommitmentsRemaining

    // Start from current net balance and subtract projected future spend
    const projectedBalance = currentNetBalance - projectedFutureSpend

    const projectedSavingsRate = totalIncome > 0
      ? Math.max(0, (projectedBalance / totalIncome) * 100)
      : 0

    return {
      projectedExpenses: Math.round(projectedFutureSpend),
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
