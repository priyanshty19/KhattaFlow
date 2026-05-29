// constants/investment-returns.ts
// India-tuned average annual return assumptions per investment vehicle.
// Hardcoded (no external market API) — see plan "Return data" decision.
// Rates are nominal annual (pre-tax, long-run averages). Used by lib/engines/goals-engine.ts.

import type { InvestmentStyle } from '@/constants/categories'

export type Vehicle =
  | 'us_stocks'
  | 'indian_stocks'
  | 'mutual_funds'
  | 'crypto'
  | 'ppf'
  | 'nps'
  | 'rd'
  | 'fd'
  | 'other'

export type Volatility = 'none' | 'low' | 'medium' | 'high' | 'very_high'

export interface VehicleMeta {
  vehicle: Vehicle
  label: string
  /** nominal annual return, decimal (0.12 = 12%) */
  rate: number
  volatility: Volatility
  /** grouping for UI + optimizer reasoning */
  group: 'equity' | 'fixed_income' | 'alternative'
  color: string
}

export const VEHICLES: Record<Vehicle, VehicleMeta> = {
  indian_stocks: { vehicle: 'indian_stocks', label: 'Indian Stocks', rate: 0.13,  volatility: 'high',      group: 'equity',       color: '#0EA5E9' },
  us_stocks:     { vehicle: 'us_stocks',     label: 'US Stocks',     rate: 0.12,  volatility: 'high',      group: 'equity',       color: '#3B82F6' },
  mutual_funds:  { vehicle: 'mutual_funds',  label: 'Mutual Funds',  rate: 0.12,  volatility: 'medium',    group: 'equity',       color: '#6366F1' },
  crypto:        { vehicle: 'crypto',        label: 'Crypto',        rate: 0.15,  volatility: 'very_high', group: 'alternative',  color: '#F59E0B' },
  nps:           { vehicle: 'nps',           label: 'NPS',           rate: 0.10,  volatility: 'low',       group: 'fixed_income', color: '#8B5CF6' },
  ppf:           { vehicle: 'ppf',           label: 'PPF',           rate: 0.071, volatility: 'none',      group: 'fixed_income', color: '#10B981' },
  fd:            { vehicle: 'fd',            label: 'Fixed Deposit', rate: 0.07,  volatility: 'none',      group: 'fixed_income', color: '#34D399' },
  rd:            { vehicle: 'rd',            label: 'Recurring Deposit', rate: 0.065, volatility: 'none',  group: 'fixed_income', color: '#22C55E' },
  other:         { vehicle: 'other',         label: 'Other',         rate: 0.08,  volatility: 'medium',    group: 'alternative',  color: '#94A3B8' },
}

/** Ordered list for rendering the allocation grid (equity → alternative → fixed income). */
export const VEHICLE_ORDER: Vehicle[] = [
  'indian_stocks', 'us_stocks', 'mutual_funds', 'crypto', 'nps', 'ppf', 'fd', 'rd', 'other',
]

export const ALL_VEHICLES: Vehicle[] = VEHICLE_ORDER

export function getVehicleMeta(v: Vehicle): VehicleMeta {
  return VEHICLES[v]
}

export function getVehicleRate(v: Vehicle): number {
  return VEHICLES[v]?.rate ?? VEHICLES.other.rate
}

/**
 * Target allocation mix per investment style — fractions of monthly investment.
 * Used by the optimizer to suggest reallocation. Mirrors the philosophy of
 * constants/categories.ts INVESTMENT_CATEGORIES (conservative→safe, aggressive→growth).
 * Each map sums to 1.0.
 */
export const TARGET_MIX: Record<InvestmentStyle, Partial<Record<Vehicle, number>>> = {
  conservative: {
    fd: 0.25, ppf: 0.25, rd: 0.15, nps: 0.15, mutual_funds: 0.15, indian_stocks: 0.05,
  },
  balanced: {
    mutual_funds: 0.35, indian_stocks: 0.15, ppf: 0.15, nps: 0.10, fd: 0.10, us_stocks: 0.10, crypto: 0.05,
  },
  aggressive: {
    mutual_funds: 0.30, indian_stocks: 0.25, us_stocks: 0.20, crypto: 0.10, nps: 0.10, ppf: 0.05,
  },
}

/** Soft cap on crypto share of the portfolio — optimizer flags exposure above this. */
export const CRYPTO_MAX_SHARE: Record<InvestmentStyle, number> = {
  conservative: 0.0,
  balanced: 0.10,
  aggressive: 0.15,
}

export const DEFAULT_STYLE: InvestmentStyle = 'balanced'
