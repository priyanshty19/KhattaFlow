# FinGrid

> Personal finance dashboard built for India — track every rupee, plan your savings, and find the best credit card for your spending pattern.

FinGrid is a full-stack Next.js application that brings together transaction tracking, budget planning, spending analytics, and an AI-powered credit card recommender (CredWise) in a single dark-themed dashboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Database Schema](#database-schema)
- [CredWise Engine](#credwise-engine)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)

---

## Features

### 🏠 Dashboard Overview
The home screen gives you a one-glance pulse of your finances for the selected month.

- **4 stat cards** — Income, Expenses, Savings, and Investments, each with month-on-month delta
- **Budget zone** — category-by-category spend vs budget bars with % utilisation
- **Insight zone** — top spending category, savings rate call-out, and the CredWise card recommendation widget
- **Month picker** — every section is scoped to a single month; switch months from the top bar
- **Quick Add** — floating button (bottom-right on mobile, top-bar on desktop) to log a transaction without leaving the page

---

### 💸 Transactions
Full transaction ledger with flexible import options.

**Manual entry**
- Log income, expense, or investment in a quick-add modal
- Assign category, payment method, notes, and date
- Mark transactions as recurring to generate future entries automatically

**Filtering & search**
- Filter by type (income / expense / investment), category, payment method, or free-text search
- Month-scoped view — see exactly what happened in any month

**Import — 3 methods**

| Method | How it works |
|--------|-------------|
| **CSV Upload** | Upload a bank statement CSV; the parser maps columns to FinGrid fields and previews rows before import |
| **Gmail Scan** | Connect Gmail via OAuth; FinGrid scans your inbox for bank transaction emails and extracts debit/credit amounts using the Gmail Parser Engine |
| **Paste SMS** | Copy-paste bank SMS alerts; the SMS Parser Engine extracts amounts, merchant names, and dates automatically |

**Recurring rules**
- Define a rule (category + amount + frequency) and FinGrid auto-creates future transactions

---

### 📊 Analytics
Visual deep-dives into your financial patterns across up to 6 months.

- **Spending trend chart** — month-on-month expense line chart (6-month window)
- **Category breakdown** — donut/bar chart showing which categories consumed your budget this month
- **Savings rate chart** — savings % of income plotted over 6 months; highlights your savings goal target line
- **Investment allocation** — pie chart of investment categories (mutual funds, stocks, FDs, etc.) for the selected month

---

### 🎯 Budget
Set monthly spending limits per category and track progress in real time.

- **Budget planner** — set a ₹ limit per category for the month
- **Progress bars** — live spend vs budget for each category; turns amber at 80%, red at 100%
- **Overview** — total budgeted vs total spent summary at the top
- **Category transactions** — drill into a category to see individual transactions that make up its spend
- **Setup CTA** — first-time prompt if no budgets are set for the month

---

### 💳 CredWise — Credit Card Recommender
Ranks every major Indian credit card by **₹ net annual value** against your actual spending pattern. Powered by the ENVS (Expected Net Value Score) algorithm.

**How it works — 5 steps:**
1. Eligibility filter — removes cards below the user's income or credit score
2. Fee filter — applies the user's joining fee preference (₹0 / under ₹1,000 / any)
3. ENVS scoring — computes ₹/year net value for each card across all spend categories
4. Brand boost — 5% score multiplier for preferred banks (tiebreaker, not dominant)
5. Top 3 — returns the highest-scoring cards

**What ENVS accounts for:**
- Reward earnings per spend category (with per-card reward rates and monthly caps)
- `platformCoverage` — merchant-specific cards (Swiggy, Scapia, Amazon Pay, Flipkart) only earn the bonus rate on the fraction of spend that actually goes through that platform, preventing inflated rankings
- Lounge access value — scaled by how much the user actually travels (non-travellers credit 4 visits, heavy travellers credit full allotment); fixes the "999 visits × ₹700 = ₹7L ENVS" bug
- Forex markup cost — subtracted for international spenders
- Fuel surcharge waiver — added as positive value for regular fuel spenders
- Annual fee with waiver check — 3-tier: achieved (fee = ₹0) / near 80–99% / unlikely
- Joining fee amortised over 3 years
- Milestone bonuses — multi-tier, partial credit if within 85% of threshold
- Sign-up bonus — amortised over 3 years; achievability checked against spend window

**Year 1 vs Year 2+ split** — rankings use Year 2+ (recurring) ENVS so one-time bonuses don't distort the comparison. Year 1 figure shown separately as a first-year bonus.

**Auto-inferred spend** — Step 2 of the form pre-fills spend sliders from the user's last 3 months of transactions. Categories with fewer than 2 transactions/month are confidence-discounted. Sliders are always editable.

**Dynamic sliders** — max spend per category equals the user's monthly income. Budget allocation bar shows total allocated vs income.

**120+ cards** across HDFC, SBI, ICICI, Axis, Kotak, AMEX, IndusInd, Yes Bank, RBL, Standard Chartered, Federal Bank, IDFC First, and more.

**Feedback loop**
- Apply Now click → intent logged to `card_apply_intents` table (fire-and-forget)
- 4 seconds after recommendations appear → Yes/No feedback modal
- "No" → free-text preferred card input → saved to `card_recommendation_feedback` for model training

**My Cards** — manual wallet tracker. Add existing cards with bank, last 4 digits, credit limit, statement day, and due date. No login required to use the recommender; My Cards is additive.

**Insights tab** — per card: why it was selected (top earning categories + ENVS breakdown), how to use it (fee waiver goal, milestone threshold, best spend categories), and key benefits (lounge visits, forex markup, fuel waiver, network type).

---

### ⚙️ Settings

- **Profile** — name (from Clerk), email, phone number (used for SMS lookup), company/employer
- **Monthly salary** — stored in paise; pre-fills income fields across the app
- **Savings goal** — set target savings % of income (5–50%); shown as a goal line on the savings rate chart
- **Gmail connect** — OAuth integration to enable Gmail transaction scanning
- **Category manager** — create, rename, and delete custom spending categories

---

### 📥 Import (dedicated page)

Accessible from Settings → Import. Three tabs:

| Tab | Description |
|-----|-------------|
| CSV Upload | Drag-and-drop or file-pick; column auto-mapping with preview table before confirming |
| Gmail Scan | Uses connected Gmail OAuth to pull bank emails; extracts transactions via regex-based parser |
| Paste SMS | Text area for raw bank SMS messages; SMS Parser Engine identifies debit/credit patterns from 15+ Indian banks |

---

### 🔐 Onboarding

New users go through a guided multi-step onboarding before reaching the dashboard:

1. **Welcome** — brief intro to FinGrid
2. **Profile** — name and basic details
3. **Income** — monthly take-home salary
4. **Commitments** — fixed monthly expenses (rent, EMIs)
5. **Goal** — savings percentage target
6. **Investment** — investment categories and amounts
7. **Credit Profile** — credit score (CIBIL, 300–900) and employment type (Salaried / Self-Employed / Business Owner / Student) — used for CredWise eligibility filtering
8. **Preview** — summary of what was entered
9. **Setup** — categories seeded
10. **Done** — redirect to dashboard

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma 5 |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| State | Zustand |
| Notifications | Sonner |
| Testing | Vitest |
| Deployment | Vercel |

---

## Project Structure

```
fingrid/
├── app/
│   ├── (dashboard)/          # All authenticated pages
│   │   ├── page.tsx           # Overview / home
│   │   ├── transactions/      # Transaction ledger
│   │   ├── analytics/         # Charts & trends
│   │   ├── budgets/           # Budget planning
│   │   ├── credit-cards/      # CredWise recommender + My Cards
│   │   └── settings/          # Profile, categories, Gmail, import
│   ├── api/                   # Next.js API routes
│   │   ├── credit-cards/      # 8 CredWise endpoints
│   │   ├── transactions/      # CRUD + import
│   │   ├── budgets/           # Budget CRUD
│   │   ├── analytics/         # Aggregation queries
│   │   ├── user/              # Profile read/write
│   │   ├── onboarding/        # Onboarding save
│   │   ├── connect/           # Gmail OAuth
│   │   └── import/            # CSV / Gmail / SMS parsers
│   ├── onboarding/            # Onboarding wizard (outside dashboard layout)
│   ├── landing/               # Public marketing page
│   └── (auth)/                # Clerk sign-in / sign-up pages
├── components/
│   ├── domain/
│   │   ├── credit-cards/      # CredWise UI components
│   │   ├── dashboard/         # Pulse, budget zone, insight zone
│   │   ├── transactions/      # List, filter, quick-add modal
│   │   ├── analytics/         # Chart components
│   │   ├── budgets/           # Budget bars, planner, tabs
│   │   ├── import/            # CSV / Gmail / SMS import flows
│   │   └── settings/          # Category manager, Gmail connect
│   ├── layout/                # Sidebar, BottomNav, TopBar
│   └── shared/                # Skeletons, common UI atoms
├── lib/
│   ├── engines/
│   │   ├── credit-card-engine.ts   # ENVS recommendation algorithm
│   │   ├── budget-engine.ts
│   │   ├── analytics-engine.ts
│   │   ├── gmail-parser-engine.ts
│   │   └── sms-parser-engine.ts
│   └── utils/
│       ├── category-mapper.ts      # FinGrid → CredWise category mapping
│       ├── spend-inference.ts      # Auto-infer spend from transactions
│       └── currency.ts             # toPaise / toRupees helpers
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                # Base categories seed
│   ├── seed-cards.ts          # Credit card catalog seed (from Excel)
│   └── data/
│       └── credit-cards.xlsx  # 120+ card catalog
├── scripts/
│   └── test-recommendations.ts  # Engine test suite (10 user profiles)
└── docs/
    └── CREDWISE_ENGINE.md     # Plain-English algorithm documentation
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- A Clerk application

### 1. Clone and install

```bash
git clone https://github.com/priyanshty19/FinGrid.git
cd FinGrid
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase / Prisma
DATABASE_URL=postgresql://postgres:[password]@[host]:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Optional — Gmail OAuth (for transaction email import)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=http://localhost:3000/api/connect/gmail/callback

# Optional — Admin secret for card seed endpoint
ADMIN_SECRET=your-secret-here
```

> **Supabase note**: Use port `6543` (transaction pooler) in `DATABASE_URL` for serverless compatibility. Use port `5432` (direct) in `DIRECT_URL` for Prisma migrations.

### 3. Push schema and generate Prisma client

```bash
npm run db:push       # creates all tables in Supabase
npm run db:generate   # generates the Prisma client
```

### 4. Seed base data

```bash
npm run db:seed       # creates default spending categories
```

### 5. Seed the credit card catalog

The card catalog ships as an Excel file at `prisma/data/credit-cards.xlsx`.

```bash
npm run db:seed-cards   # upserts 120+ cards into the credit_cards table
```

Safe to re-run — upserts by card ID, no duplicates.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — new users are redirected to onboarding automatically.

---

## Database Schema

| Model | Purpose |
|-------|---------|
| `User` | Clerk userId, income (paise), credit score, employment type, savings goal, company |
| `Category` | User-defined spend categories (name, slug, icon, colour) |
| `Transaction` | Every income / expense / investment entry with category, date, amount, notes |
| `Budget` | Monthly ₹ limit per category |
| `RecurringRule` | Rules that auto-generate transactions (frequency, amount, category) |
| `Import` | Import job records — tracks CSV / Gmail / SMS import batches |
| `MonthlySummary` | Pre-computed monthly totals cache (income, expenses, savings, investments) |
| `OtpVerification` | Phone OTP records for SMS import auth |
| `OAuthConnection` | Stored OAuth tokens (Gmail) per user |
| `CreditCard` | Full card catalog — 120+ cards with all ENVS fields |
| `CreditCardPreference` | Per-user joining fee preference + preferred banks |
| `CardRecommendation` | Cached recommendation result per user per month |
| `CardRecommendationFeedback` | Yes/No rating + preferred card text (ML training data) |
| `CardApplyIntent` | Logged every time a user clicks Apply Now (conversion tracking) |
| `UserCreditCard` | User's manually added wallet cards (limit, due date, last 4) |

---

## CredWise Engine

The full algorithm is documented in plain English in [`docs/CREDWISE_ENGINE.md`](docs/CREDWISE_ENGINE.md).

**Quick summary of ENVS:**

```
ENVS (Year 2+) =
    Total Annual Rewards          ← spend × effective rate × point value, per category
  + Milestone Bonus               ← if achievable (≥85% of threshold gets partial credit)
  + Lounge Annual Value           ← effective visits × ₹ per visit (scaled by travel intensity)
  + Fuel Surcharge Savings        ← annual fuel spend × 1% (if card has waiver)
  − Effective Annual Fee          ← ₹0 if waived / 50% if near / full if unlikely
  − Forex Annual Cost             ← annual international spend × forex markup %
```

**Card overrides in `prisma/seed-cards.ts`:**

| Card | Override | Reason |
|------|----------|--------|
| HDFC Millennia / MoneyBack+ / Pixel Play | `pointValue = 1.0` | CashPoints = ₹1 each (not ₹0.25 standard HDFC points) |
| AMEX Membership Rewards cards | `pointValue = 0.50` | Realistic transfer partner rate |
| Federal Scapia | `platformCoverage = 0.25` | Only 25% of travel spend goes through Scapia portal |
| Swiggy HDFC | `platformCoverage = 0.30` | Only 30% of dining spend is via Swiggy |
| Amazon Pay ICICI | `platformCoverage = 0.40` | Only 40% of online shopping is on Amazon.in |
| Flipkart Axis | `platformCoverage = 0.35` | Only 35% of online shopping is on Flipkart |

Run the engine test suite to verify rankings across 10 synthetic user profiles:

```bash
npm run test:recs
```

---

## Deployment

### Prerequisites (run once against production DB)

```bash
# 1. Push schema — creates any new tables, adds nullable columns to existing ones
npx prisma db push

# 2. Seed card catalog — upserts 120+ cards (safe to re-run)
npm run db:seed-cards
```

### Deploy

```bash
git push origin master   # Vercel auto-builds on every push to master
```

The `build` script (`prisma generate && next build`) regenerates the Prisma client automatically during every Vercel build — no manual step needed in CI.

### Environment variables on Vercel

Add the same variables from `.env.local` to your Vercel project settings. Vercel injects them at build time and runtime.

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Generate Prisma client + production Next.js build |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database (no migration files) |
| `npm run db:generate` | Regenerate Prisma client without touching the DB |
| `npm run db:seed` | Seed base data (default categories) |
| `npm run db:seed-cards` | Seed credit card catalog from `prisma/data/credit-cards.xlsx` |
| `npm run db:studio` | Open Prisma Studio — visual database browser |
| `npm run test:recs` | Run CredWise engine test suite (10 user profiles, prints ranked results) |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
