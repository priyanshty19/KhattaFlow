# KhattaFlow

Personal finance dashboard for India — track transactions, set budgets, and get AI-powered credit card recommendations.

---

## Features

### 💳 CredWise — Credit Card Recommender
Ranks every credit card in India by **₹ net annual value** against your actual spending pattern.

- **ENVS algorithm** — computes expected net value (rewards earned − fees paid − forex cost + lounge + fuel savings) for each card
- **Auto-inferred spend** — pre-fills sliders from your last 3 months of transaction history
- **120+ cards** across HDFC, SBI, ICICI, Axis, AMEX, Kotak, IndusInd and more
- **Merchant-accuracy** — Swiggy, Scapia, Amazon Pay and Flipkart cards have realistic platform coverage applied (not inflated category rates)
- **Year 1 vs Year 2+** — separates one-time sign-up bonuses from recurring annual value
- **Fee waiver tracking** — shows whether you'll hit the spend threshold to get the annual fee waived
- **Feedback loop** — captures apply intent and Yes/No rating per recommendation set for model training
- **My Cards** — manual wallet tracker (card name, limit, due date)

### 📊 Dashboard
- Income / expense / savings / investment overview
- Month-on-month trend charts
- Budget tracking with category breakdown

### 💸 Transactions
- Manual entry + CSV import
- Recurring rules
- Category tagging

### 🎯 Budget
- Monthly budget per category
- Spend vs budget progress bars

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma 5 |
| UI | Tailwind CSS + Radix UI |
| Charts | Recharts |
| Language | TypeScript |

---

## Local Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- A Clerk application

### 1. Install dependencies
```bash
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
```

### 3. Push schema + generate client
```bash
npm run db:push       # pushes all tables to Supabase
npm run db:generate   # generates Prisma client
```

### 4. Seed credit card catalog
```bash
# Place credit-cards.xlsx in prisma/data/
npm run db:seed-cards
```

### 5. Run dev server
```bash
npm run dev
```

---

## Database Schema — Key Models

| Model | Purpose |
|-------|---------|
| `User` | Clerk userId, income, credit score, employment type |
| `Transaction` | All income/expense/investment entries |
| `Category` | User-defined spend categories |
| `Budget` | Monthly budget per category |
| `CreditCard` | Full card catalog (120+ cards) seeded from Excel |
| `CreditCardPreference` | Per-user fee preference + preferred banks |
| `CardRecommendation` | Cached recommendation result per user per month |
| `CardApplyIntent` | Logged every time a user clicks "Apply Now" |
| `CardRecommendationFeedback` | Yes/No rating + preferred card text for ML training |
| `UserCreditCard` | User's manually added wallet cards |

---

## Credit Card Seeding

The card catalog lives in `prisma/data/credit-cards.xlsx` (Excel sheet named `Card-Data`).

```bash
npm run db:seed-cards   # upserts all cards into credit_cards table
```

To reseed after updating the Excel:
```bash
npm run db:seed-cards   # safe to re-run — upserts by card ID
```

### Card Overrides
`prisma/seed-cards.ts` contains `CARD_OVERRIDES` — hardcoded corrections applied after Excel parsing:
- **HDFC CashPoints cards** (Millennia, MoneyBack+, Pixel Play): pointValue overridden to `1.0` (CashPoints = ₹1 each, not standard HDFC points at ₹0.25)
- **AMEX MR cards**: pointValue `0.50` (realistic transfer partner rate)
- **Merchant-specific cards** (Scapia, Swiggy HDFC, Amazon Pay ICICI, Flipkart Axis): platformCoverage set to 0.25–0.40 to prevent inflated ENVS

---

## Recommendation Engine

See [`docs/CREDWISE_ENGINE.md`](docs/CREDWISE_ENGINE.md) for a full plain-English explanation of how the engine ranks cards.

Quick summary:
1. **Eligibility filter** — removes cards where the user's income or credit score is too low
2. **Fee filter** — removes cards outside the user's joining fee preference
3. **ENVS scoring** — ranks remaining cards by ₹ net annual value
4. **Top 3** — returns up to 3 cards (preferred brand first if selected)

---

## Deployment (Vercel)

```bash
# 1. Push schema to production DB before deploying code
npx prisma db push

# 2. Seed card catalog in production
npm run db:seed-cards

# 3. Deploy via git push (Vercel auto-builds on push to master)
git push origin master
```

The `build` script (`prisma generate && next build`) ensures the Prisma client is always regenerated during CI/Vercel builds.

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + Next.js production build |
| `npm run db:push` | Push schema changes to database (no migration files) |
| `npm run db:generate` | Regenerate Prisma client without pushing schema |
| `npm run db:seed` | Seed base data (categories, system data) |
| `npm run db:seed-cards` | Seed credit card catalog from Excel |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run test:recs` | Run recommendation engine test suite (10 user profiles) |
| `npm run test` | Run unit tests (Vitest) |
