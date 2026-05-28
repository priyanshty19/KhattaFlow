# PaisaFlow — Codex Continuation Prompt

## Project Context

You are continuing development on **PaisaFlow**, a production-grade personal finance dashboard built for an Indian salaried user (Piyush Tyagi, Deputy PM at Paisabazaar, Delhi NCR). The app is fully scaffolded. Your job is to complete, fix, and extend it.

## Tech Stack
- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + **shadcn/ui** + **Framer Motion**
- **Recharts** for all charts
- **Supabase** (PostgreSQL via Prisma ORM)
- **Clerk** for auth
- **Zustand** (UI state) + **TanStack Query** (server state)
- **Sonner** for toasts

## Design System
- Dark theme only: `zinc-950` background, `zinc-900` cards, `zinc-800` borders
- Accent: `emerald-500` (primary), `red-400` (danger), `amber-400` (warning), `blue-400` (investment)
- Font: Geist Sans (variable), tabular-nums for all money
- All amounts stored as **paise** (integer). Display divides by 100. Never use floats for money.
- Currency always: INR (₹)

## Domain Rules
- `type` field on transactions: `income | expense | investment | savings`
- `paymentMethod`: `cash | credit_card | upi | bank_transfer | auto_debit`
- `month` column on transactions is pre-computed string `'2026-05'` — always index on this
- Amounts in DB = paise (integer). `₹25,000 = 2500000 paise`
- Savings rate = `(totalSavings + totalInvestments) / totalIncome * 100`
- Net balance = `totalIncome - totalExpenses - totalSavings - totalInvestments`

## File Structure
```
app/
  (auth)/sign-in/  sign-up/
  (dashboard)/
    page.tsx              ← Dashboard
    transactions/page.tsx
    analytics/page.tsx
    budgets/page.tsx
    settings/import/page.tsx
  api/
    transactions/route.ts + [id]/route.ts
    budgets/route.ts + status/route.ts
    analytics/summary/route.ts + trends/route.ts
    insights/route.ts
    predictions/month-end/route.ts
    import/validate/route.ts + execute/route.ts
    categories/route.ts
components/
  layout/   AppShell.tsx  Sidebar.tsx
  domain/
    dashboard/   StatCard  DashboardPulse  DashboardBudgetZone  DashboardInsightZone  PredictionCard
    transactions/ TransactionCard  TransactionList  TransactionFilter  QuickAddModal  RecentTransactions
    budgets/     BudgetBar  BudgetOverview  BudgetSetupCTA
    insights/    InsightCard
    analytics/   (NEEDS BUILDING — see tasks below)
    import/      (NEEDS BUILDING — see tasks below)
  shared/   CurrencyDisplay  MonthSelector  EmptyState  Skeletons
  providers/ QueryProvider
lib/
  engines/  transaction-engine  budget-engine  analytics-engine  insight-engine  prediction-engine  summary-engine
  queries/  transactions.ts  index.ts (analytics, budgets, insights, predictions, categories)
  utils/    currency.ts  date.ts  cn.ts
  validations/ transaction.ts  budget.ts
  prisma.ts
stores/  ui.store.ts
constants/ categories.ts
prisma/  schema.prisma  seed.ts
```

---

## Task List — Complete These In Order

### TASK 1: Fix TransactionCard amount display bug
In `components/domain/transactions/TransactionCard.tsx`, the `CurrencyDisplay` component has a duplicate `amount` prop. Fix it:
```tsx
// WRONG (current):
<CurrencyDisplay
  amount={Math.abs(t.amount)}
  ...
  amount={signedAmount < 0 ? -t.amount : t.amount}
/>

// CORRECT:
<CurrencyDisplay
  amount={isIncome ? t.amount : -t.amount}
  colorCoded
  showSign
  size="sm"
/>
```

### TASK 2: Add missing `zod` import to validations
Both validation files use `z` from zod but may be missing the import. Ensure:
```ts
import { z } from 'zod'
```
is at the top of `lib/validations/transaction.ts` and `lib/validations/budget.ts`.

### TASK 3: Build Analytics Chart Components
Create these files in `components/domain/analytics/`:

**SpendingTrendChart.tsx**
- Props: `{ months: number }`
- Fetches from `useAnalyticsTrends(months)`
- Renders a Recharts `AreaChart` with two series: Income (emerald) and Expenses (red)
- Gradient fill under both lines
- Custom tooltip showing ₹ formatted values
- `ResponsiveContainer` width=100% height=240

**CategoryBreakdownChart.tsx**
- Props: `{ month: string }`
- Fetches from `useAnalyticsSummary(month)`
- Uses `categoryGroups` from the response
- Renders a `PieChart` with `innerRadius=60` `outerRadius=90` (donut style)
- Each slice colored by `categoryColor`
- Legend below showing category name + formatted amount
- Only show `expense` type categories

**SavingsRateChart.tsx**
- Props: `{ months: number }`
- Fetches from `useAnalyticsTrends(months)`
- Renders a `BarChart` of `savingsRate` per month
- Bars colored: green if ≥20%, amber if ≥10%, red if <10%
- Show a horizontal reference line at 20% (the target)
- Custom tooltip: "{month}: {rate}% savings rate"

**InvestmentAllocationChart.tsx**
- Props: `{ month: string }`
- Fetches from `useAnalyticsSummary(month)`
- Filters `categoryGroups` where `type === 'investment'`
- Renders a `PieChart` donut
- If no investment data, show `EmptyState`

All charts:
- Dark background: `bg-zinc-900 border border-zinc-800 rounded-2xl p-5`
- Title + subtitle text above chart
- `ChartSkeleton` from `@/components/shared/Skeletons` while loading
- Custom tooltip style: `bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs shadow-xl`

### TASK 4: Build CSV Import Flow Component
Create `components/domain/import/CSVImportFlow.tsx`:

State machine: `'idle' | 'parsing' | 'validating' | 'preview' | 'importing' | 'done' | 'error'`

**Step 1 — Upload (idle)**
- Drag-and-drop zone using HTML5 drag events
- File input fallback (`.csv` only, max 5MB)
- Show template column names: `date, description, amount, type, category, payment_method, notes`
- "Download template" link (generates and downloads a sample CSV)
- Use `papaparse` to parse: `import Papa from 'papaparse'`

**Step 2 — Validating**
- POST rows to `/api/import/validate`
- Show spinner

**Step 3 — Preview**
- Show summary: "48 valid rows, 2 errors"
- Show error table (row number + message) if errors exist
- Show preview table of first 10 valid rows (date, description, amount, category)
- "Import {n} transactions" button + "Cancel" button

**Step 4 — Importing**
- POST to `/api/import/execute` with `{ rows, filename }`
- Progress indicator

**Step 5 — Done**
- Success message with count
- "View transactions" link → `/transactions`
- "Import another" button to reset

### TASK 5: Build Edit Transaction Modal
Create `components/domain/transactions/EditTransactionModal.tsx`:
- Reads `editTransactionId` from `useUIStore`
- Fetches the transaction from TanStack Query cache or API
- Same form fields as QuickAddModal but pre-filled
- Uses `useUpdateTransaction()` mutation on submit
- Calls `closeEditTransaction()` on success or cancel
- Same visual style as QuickAddModal (dark modal, spring animation)

### TASK 6: Build Onboarding Flow
Create `app/onboarding/page.tsx`:
This runs after first sign-up (`NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"`).

Steps:
1. **Welcome** — "Let's set up PaisaFlow for you"
2. **Salary** — Input field for monthly take-home (stored in `users.monthly_salary`)
3. **Savings goal** — Slider 10%–40% (stored in `users.savings_goal_pct`, default 20%)
4. **Categories** — Auto-seeds via `POST /api/categories`, shows "Setting up your categories..."
5. **Budget wizard** — 6 key categories with suggested amounts pre-filled (Home Loan ₹25K, Maa ₹6K, Airtel ₹2.5K, etc.)
6. **Done** — Redirect to `/`

Use `useUser()` from `@clerk/nextjs` to get `userId`.
Create user record via `POST /api/user` (create this route too — upserts into `users` table).

### TASK 7: Add Webhook for Clerk User Creation
Create `app/api/webhooks/clerk/route.ts`:
- Receives Clerk `user.created` webhook
- Creates a user record in the DB
- Seeds default categories automatically
- Use `svix` for webhook verification: `npm install svix`
- Add `CLERK_WEBHOOK_SECRET` to `.env.local.example`

```ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
```

In Clerk dashboard → Webhooks → Add endpoint:
- URL: `https://your-domain.com/api/webhooks/clerk`
- Events: `user.created`

### TASK 8: Add Settings Page
Create `app/(dashboard)/settings/page.tsx`:
- **Profile section**: Display name, email (from Clerk), monthly salary input
- **Savings goal**: Percentage slider with live preview "At ₹1,08,500 salary, saving 20% = ₹21,700/month"
- **Categories management**: List all categories with color dot, ability to add custom category
- **Danger zone**: "Clear all data for [month]" button (soft delete)

### TASK 9: Fix the `useTransactions` import in `RecentTransactions.tsx`
The file imports from `@/lib/queries` but `useTransactions` is in `@/lib/queries/transactions`. Fix:
```ts
// WRONG:
import { useTransactions } from '@/lib/queries'

// CORRECT:
import { useTransactions } from '@/lib/queries/transactions'
```

### TASK 10: Add `POST /api/user` route
Create `app/api/user/route.ts`:
```ts
// Upserts user into DB after Clerk auth
// Body: { name?: string; email: string; monthlySalary?: number; savingsGoalPct?: number }
// Uses auth() from Clerk to get userId
// Prisma upsert on users table
```

---

## Component Conventions to Follow

```tsx
// All money display — use CurrencyDisplay, never raw strings
<CurrencyDisplay amount={paise} size="lg" colorCoded />

// All month navigation — use MonthSelector
<MonthSelector value={month} onChange={setMonth} />

// All empty states — use EmptyState
<EmptyState icon={Target} title="..." description="..." action={...} />

// Loading states — use Skeletons
if (isLoading) return <ChartSkeleton />

// All card containers
<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">

// All page wrappers
<div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">
```

## API Response Conventions

All API routes follow this pattern — do not deviate:
```ts
export async function GET(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... validate, query, return
  return NextResponse.json(data)
}
```

## Query Key Conventions

```ts
// Always use structured query keys
['transactions', 'list', { month, type }]
['analytics', 'summary', month]
['budgets', 'status', month]
['insights', month]
['predictions', 'month-end', month]
['categories']
```

## Paise ↔ Rupees Conversion

```ts
// ALWAYS use these utils — never raw division/multiplication
import { toPaise, toRupees, formatINR } from '@/lib/utils/currency'

toPaise(1500)      // 150000  (rupees → paise for DB writes)
toRupees(150000)   // 1500    (paise → rupees for computation)
formatINR(150000)  // "₹1,500" (paise → display string)
```

---

## Known Issues to Fix

1. `TransactionCard.tsx` — duplicate `amount` prop on `CurrencyDisplay` (Task 1)
2. `RecentTransactions.tsx` — wrong import path for `useTransactions` (Task 9)
3. Analytics page imports `SpendingTrendChart` etc. which don't exist yet (Task 3)
4. Import page imports `CSVImportFlow` which doesn't exist yet (Task 4)
5. `geist` package may need installing: `npm install geist`

---

## Environment Variables Required

```
DATABASE_URL          Supabase Transaction mode (port 6543)
DIRECT_URL            Supabase Direct mode (port 5432)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLERK_WEBHOOK_SECRET  (after Task 7)
```

---

## Run Order for First-Time Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
# Sign up → /onboarding runs → categories seeded → dashboard ready
```

---

## User Context (for personalisation decisions)

- **User**: Piyush Tyagi (PT), Delhi NCR
- **Salary**: ₹1,08,500/month take-home
- **Fixed costs**: Home Loan ₹25K · Maa ₹6K · MacBook EMI ₹5K · Airtel ₹2.5K · Jio ₹350
- **Investments**: Mutual Funds (variable ₹7K–₹20K) · Indian stocks · US stocks · Silver · Atal Pension
- **Ventures**: Mecako (streetwear brand — track as expense category for now)
- **Pain point**: CC catch-all bucket — needs per-transaction categorisation
- **Savings goal**: 20%+ of income

Default budget suggestions for wizard:
```
Home Loan EMI  → ₹25,000
Maa            → ₹6,000
MacBook EMI    → ₹5,000
Airtel         → ₹2,500
Jio            → ₹350
Subscriptions  → ₹1,500
Utilities      → ₹5,000
Office Travel  → ₹3,000
Credit Card    → ₹25,000
Mutual Funds   → ₹15,000
```
