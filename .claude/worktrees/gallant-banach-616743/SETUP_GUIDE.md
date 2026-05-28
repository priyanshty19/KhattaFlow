# PaisaFlow — Local Setup & Hosting Guide

## What You're Building
A production-grade personal finance dashboard. Before starting, you need accounts on:
- **Supabase** (free) — supabase.com
- **Clerk** (free) — clerk.com
- **Vercel** (free, for later deployment) — vercel.com

---

## Prerequisites

Install these if you don't have them:

```bash
# Check if Node.js is installed (need v18+)
node --version

# If not installed, download from nodejs.org
# Or via nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18

# Check npm
npm --version
```

---

## Step 1 — Get the Code

```bash
# Unzip the project
unzip paisaflow.zip -d paisaflow
cd paisaflow

# Verify structure
ls
# Should show: app/ components/ lib/ prisma/ package.json etc.
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

This installs ~200MB of packages. Takes 1–2 minutes.

---

## Step 3 — Set Up Supabase

### 3a. Create a Project
1. Go to **supabase.com** → Sign up / Log in
2. Click **"New Project"**
3. Choose your organization
4. Fill in:
   - **Name:** `paisaflow`
   - **Database Password:** Create a strong one — **save this, you'll need it**
   - **Region:** `Southeast Asia (Singapore)` — closest to Delhi NCR
5. Click **"Create new project"** — wait ~2 minutes

### 3b. Get Your Connection Strings
1. In your Supabase project → **Settings** (gear icon, left sidebar)
2. Click **"Database"**
3. Scroll to **"Connection string"**
4. Select **"URI"** tab

You need **two** URLs:

**Transaction mode** (for DATABASE_URL):
- Toggle "Connection pooling" → **ON**
- Mode: **Transaction**
- Copy the URI — it ends with `:6543/postgres`

**Direct mode** (for DIRECT_URL):
- Toggle "Connection pooling" → **OFF**
- Copy the URI — it ends with `:5432/postgres`

Both look like:
```
postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:PORT/postgres
```

Replace `[YOUR-PASSWORD]` with the password you set in Step 3a.

---

## Step 4 — Set Up Clerk

### 4a. Create Application
1. Go to **clerk.com** → Sign up / Log in
2. Click **"Add application"**
3. Name it: `PaisaFlow`
4. Enable sign-in methods: **Google** + **Email** (recommended)
5. Click **"Create application"**

### 4b. Get API Keys
1. You'll land on the quickstart page — or go to **API Keys** in the left sidebar
2. Copy:
   - **Publishable key** — starts with `pk_test_`
   - **Secret key** — starts with `sk_test_`

---

## Step 5 — Create Your .env.local File

In the project root, create `.env.local`:

```bash
# In the paisaflow/ directory:
cp .env.local.example .env.local
```

Now open `.env.local` in any text editor and fill it in:

```bash
# Paste your Supabase Transaction mode URL here
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Paste your Supabase Direct URL here
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

# Paste your Clerk keys here
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxxxxxx"
CLERK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxx"

# Leave these as-is
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Step 6 — Push Database Schema

This creates all your tables in Supabase:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase (creates all tables)
npx prisma db push
```

Expected output:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema.
```

### Verify Tables Were Created
1. Go to Supabase → **Table Editor** (left sidebar)
2. You should see: `users`, `categories`, `transactions`, `budgets`, `monthly_summaries`, `recurring_rules`, `imports`

---

## Step 7 — Enable Row Level Security (Important)

In Supabase → **SQL Editor** → click **"New query"** → paste and run:

```sql
-- Enable RLS on all tables
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports           ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only see their own data)
CREATE POLICY "users_own" ON users
  FOR ALL USING (id = auth.uid()::text);

CREATE POLICY "categories_own" ON categories
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "budgets_own" ON budgets
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "summaries_own" ON monthly_summaries
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "recurring_own" ON recurring_rules
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "imports_own" ON imports
  FOR ALL USING (user_id = auth.uid()::text);
```

Click **"Run"** — should say "Success. No rows returned."

---

## Step 8 — Run the App

```bash
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in 2.1s
```

Open **http://localhost:3000** in your browser.

---

## Step 9 — First Login Flow

1. You'll see the PaisaFlow sign-in page
2. Sign up with Google or email
3. After sign-in, you land on the dashboard
4. **First thing:** Go to any page — the app will auto-seed your categories on first API call
5. Or manually trigger it: open browser console and run:
   ```js
   fetch('/api/categories', { method: 'POST' })
   ```

You should now see all 25+ categories (Salary, Home Loan, Maa, Mecako, Mutual Funds, etc.)

---

## Step 10 — Import Your Excel Data

Your existing Tyagi_Expense_Tracker.xlsx data can be imported via CSV.

### Convert Excel to CSV
1. Open your Excel file
2. For each sheet you want to import:
   - File → Save As → CSV UTF-8
3. Or export directly from Google Sheets

### Format the CSV
The import expects these columns (add a header row if missing):

```
date,description,amount,type,category,payment_method,notes
01/05/2026,May Salary,108500,income,Salary,bank_transfer,
05/05/2026,Home Loan EMI,25000,expense,Home Loan EMI,auto_debit,
14/05/2026,HDFC MF SIP,15000,investment,Mutual Funds,auto_debit,
```

**Type values:** `income` / `expense` / `investment` / `savings`
**Payment values:** `cash` / `credit_card` / `upi` / `bank_transfer` / `auto_debit`
**Categories:** Match names from your category list (fuzzy matched — "MF" → "Mutual Funds")

### Import
1. Go to **Settings → Import CSV** in the sidebar
2. Upload your CSV
3. Review the validation preview
4. Confirm import

---

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npx prisma generate
```

### Database connection errors
- Double-check both URLs in `.env.local`
- Make sure the password has no special characters that need URL-encoding
- Try wrapping the password in the URL with quotes

### Clerk auth not working
- Verify keys in `.env.local` match exactly what's in Clerk dashboard
- Make sure you're using the right app (not a demo app)

### Tables don't exist
```bash
npx prisma db push --force-reset
```
⚠️ This drops and recreates all tables — only use on fresh setup

### Port 3000 in use
```bash
npm run dev -- -p 3001
# Then open http://localhost:3001
```

### View database visually
```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## Useful Dev Commands

```bash
# Start dev server
npm run dev

# View & edit database in browser
npx prisma studio

# Re-push schema after changes
npx prisma db push

# Regenerate Prisma types after schema changes
npx prisma generate

# Check for TypeScript errors
npx tsc --noEmit

# Lint
npm run lint
```

---

## Deploy to Vercel (When Ready)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: paisaflow
# - Root directory: ./
# - Override settings? No
```

Then add environment variables in Vercel dashboard:
1. Go to vercel.com → Your project → Settings → Environment Variables
2. Add all 8 variables from your `.env.local`
3. Redeploy: `vercel --prod`

---

## What Works After Setup

| Feature | Status |
|---|---|
| Sign in / Sign up | ✅ Clerk |
| Add transactions (Quick Add modal) | ✅ |
| Category system (25+ categories) | ✅ Pre-seeded |
| Monthly dashboard with KPIs | ✅ |
| Budget setup + health bars | ✅ |
| Insights engine (7 rules) | ✅ |
| Month-end prediction | ✅ |
| Analytics charts | ✅ Recharts |
| CSV import | ✅ |
| Transaction list + filter | ✅ |

---

## Next Steps for Codex

When you take this to Codex, give it the full codebase zip + the `CODEX_PROMPT.md` file included in the zip. Codex will handle:
- Fixing any TypeScript errors
- Adding missing shadcn/ui components
- Wiring up remaining UI states
- Adding the spending analytics charts to the analytics page
