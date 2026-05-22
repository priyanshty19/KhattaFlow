# CredWise Recommendation Engine — Plain English Guide

> **Who is this for?** Anyone who wants to understand how FinGrid picks credit cards for a user — without reading the code.

---

## The Big Idea

Every credit card is ranked by a single number: **ENVS** (Expected Net Value Score).

> **ENVS = Money you earn from rewards − Money you pay in fees − Hidden costs + Perks**

The card with the highest ENVS for *your specific spending pattern* is card #1. Simple.

---

## Step 1 — Eliminating Cards You Can't Get (The Eligibility Filter)

Before any scoring happens, we throw out cards the user isn't eligible for.

Three checks:

| Check | What it does | Example |
|-------|-------------|---------|
| **Income** | Card has a minimum monthly income requirement. If the user earns less, it's removed. | HDFC Infinia requires ₹3.5L/month. A ₹50k earner doesn't see it. |
| **Credit Score** | Card needs a minimum CIBIL score. If the user's score is too low, removed. | A premium card needing 800 score won't show to someone at 680. |
| **Employment Type** | Some cards are only for salaried employees. If the card requires 'salaried' and the user is self-employed, removed. | Corporate credit cards. |

**Result:** We go from 120 cards → maybe 40–80 eligible cards.

---

## Step 2 — Fee Filter

The user told us how much joining fee they're willing to pay. We apply that filter:

| User's preference | What stays |
|------------------|-----------|
| **No Fee** | Only cards with ₹0 joining fee |
| **Under ₹1,000** | Cards with joining fee ≤ ₹1,000 |
| **Any Amount** | All eligible cards pass through |

**Result:** 40–80 cards → maybe 20–60 cards.

---

## Step 3 — Scoring Every Remaining Card (ENVS Calculation)

For each remaining card, we calculate exactly how much money the user gains or loses in a year.

### 3a. Reward Earnings per Category

For each spending category (Dining, Travel, etc.), we compute:

```
Monthly reward from Dining = Monthly Dining spend × Dining reward rate × Point value
```

**Real example:**
- User spends ₹6,000/month on Dining
- HDFC Regalia Gold earns 5% on Dining
- Points are worth ₹0.50 each (rewards points)
- Monthly dining reward = ₹6,000 × 5% × (reward conversion) = ₹240/month = ₹2,880/year

We do this for every category the user spends in, then add them all up → **Total Annual Rewards**.

### 3b. Platform Coverage (The Fairness Fix)

Some cards *look* like they earn 10% on all Dining but actually only earn 10% on **Swiggy orders specifically**. Without this fix, Swiggy HDFC would rank #1 for every person who eats out.

We apply a `platformCoverage` multiplier (0.0 to 1.0):

```
Effective rate = Base rate + (Bonus rate − Base rate) × Platform Coverage
```

| Card | platformCoverage | Meaning |
|------|-----------------|---------|
| Swiggy HDFC | 0.30 | Only 30% of your Dining spend is via Swiggy, so only 30% gets the 10% bonus rate |
| Amazon Pay ICICI | 0.40 | Only 40% of Online Shopping happens on Amazon.in |
| Federal Scapia | 0.25 | Only 25% of Travel goes through the Scapia portal |
| Standard HDFC card | 1.00 | 100% of spend earns the full category rate |

### 3c. Confidence Weighting

When spend amounts are inferred from transaction history, we check how many transactions we have:

| Confidence | Transactions/month | Multiplier on spend |
|-----------|---------------------|---------------------|
| **High** | 6+ per month | 1.00 (full amount) |
| **Medium** | 2–5 per month | 0.90 (10% discount) |
| **Low** | < 2 per month | 0.75 (25% discount) |

A user with one travel transaction in 3 months — we're not sure that's representative, so we reduce the travel spend estimate by 25%.

### 3d. Annual Fee (the Cost)

We check whether the user will actually have the annual fee waived:

| Fee Waiver Status | How we determine it | Effect on ENVS |
|-------------------|--------------------|--------------| 
| **Achieved** | User's annual spend ≥ waiver threshold | Fee = ₹0 |
| **Near** | User's annual spend is 80–99% of threshold | Fee = 50% of annual fee (partial credit — they might just hit it) |
| **Unlikely** | User's annual spend < 80% of threshold | Fee = full annual fee |

### 3e. Joining Fee (spread over 3 years)

Joining fees are a one-time cost. We spread them over 3 years for a fair comparison:

```
Joining fee per year = Total joining fee ÷ 3
```

A ₹5,000 joining fee becomes ₹1,667/year in the calculation.

### 3f. Lounge Access Value

Lounge visits are real money saved (you'd pay ₹700–₹1,200 per airport lounge entry otherwise).

But we don't just multiply visits × value blindly. We ask: **how much does this user actually travel?**

| Monthly travel spend | Realistic annual lounge usage |
|---------------------|-------------------------------|
| < ₹1,000 | 4 visits max (non-traveller) |
| ₹1,000–₹5,000 | ~20% of allotted visits |
| ₹5,000–₹15,000 | ~40% of allotted visits |
| ₹15,000–₹20,000 | ~70% of allotted visits |
| ₹20,000+ | Full allotted visits (heavy traveller) |

Cards with **unlimited lounge** (sentinel value 999 in DB) are capped at 4 / 12 / 30 visits depending on travel intensity. This fixed the ₹7L HSBC Premier bug (999 visits × ₹700 = ₹6.99L inflated ENVS).

```
Lounge value = Effective visits × ₹ per visit
```

### 3g. Forex Markup Cost (subtracted)

If the user spends internationally, a 3.5% forex markup is a real annual cost. Cards with lower markup (or 0%) are worth more to international spenders.

```
Forex cost = Annual international spend × forex markup %
```

This amount is **subtracted** from ENVS. A user spending ₹20,000/month internationally pays ₹8,400/year extra on a 3.5% markup card.

### 3h. Fuel Surcharge Savings (added)

Indian fuel pumps charge a 1% surcharge on credit card payments (unless the card has a waiver). Cards with a fuel surcharge waiver save money for regular fuel spenders.

```
Fuel savings = Annual fuel spend × 1%
```

### 3i. Milestone Bonuses

Some cards give bonus vouchers or points if you cross an annual spend threshold. We check if the user is likely to cross it:

- ≥ 100% of threshold → full milestone bonus credited
- 85–99% of threshold → 50% partial credit (close enough, might hit it)
- < 85% of threshold → ₹0 (unlikely to reach)

Cards with multiple milestone tiers (e.g., ₹3L = 3,000 pts, ₹6L = 5,000 pts) are evaluated tier-by-tier.

### 3j. Sign-Up Bonus

One-time sign-up bonuses are only credited if the user can realistically hit the required spend in the sign-up window. Amortised over 3 years for scoring (so it doesn't inflate Year 1 unfairly).

---

## The Final ENVS Formula

```
ENVS (Year 2+, recurring) =
    Total Annual Rewards
  + Milestone Bonus (if achievable)
  + Lounge Annual Value
  + Fuel Surcharge Savings
  − Effective Annual Fee (after waiver check)
  − Forex Annual Cost

ENVS (Year 1) = same as above + full Sign-Up Bonus − full Joining Fee
```

**We rank cards by Year 2+ ENVS** (the conservative, recurring number) because that's the real long-term value. Year 1 is shown separately as a "first year bonus" display figure.

---

## Step 4 — Preferred Brand Boost

If the user picked a preferred bank (e.g., "I want HDFC cards"), those cards get a 5% score multiplier:

```
Final score = ENVS × (1 + spend alignment boost 0–2%) × 1.05 (if preferred brand)
```

The spend alignment boost (0–2%) is a small tiebreaker — it rewards cards whose bonus categories match where the user actually spends money.

---

## Step 5 — Final Top 3

Cards are sorted by final score. We return the **top 3**:
- If preferred brands were selected and at least 1 eligible preferred-brand card exists → show those first, fill remaining slots from general pool
- If no preferred brands → top 3 from all eligible cards

---

## Every Database Column Explained

### `credit_cards` table

| Column | Plain English |
|--------|--------------|
| `id` | Unique identifier, format `BANK-XXX` (e.g. `HDFC-068`) |
| `cardName` | Full card name as printed on the card |
| `bank` | Issuing bank (exact match to what the engine uses for brand preference) |
| `cardType` | Category label: "Premium", "Rewards", "Cashback", "Travel", "Entry-Level" |
| `creditScoreRequirement` | Minimum CIBIL score needed to apply. 0 = no requirement. |
| `monthlyIncomeRequirement` | Minimum monthly take-home pay needed. 0 = no requirement. |
| `joiningFee` | One-time fee paid when you first get the card (₹) |
| `annualFee` | Yearly maintenance fee (₹) |
| `feeWaiverThreshold` | Annual spend needed to get the annual fee waived (₹). 0 = no waiver possible. |
| `rewardType` | How the card returns value: `cashback` (direct ₹ credit), `points` (bank reward points), `miles` (airline miles), `hybrid` (mix) |
| `pointValue` | How much each reward point is worth in ₹. Cashback cards = 1.0. Standard HDFC points = 0.25. AMEX MR = 0.50. |
| `baseRewardRate` | Default earn rate % on ALL spend (for spend not covered by a category rate). E.g. 0.5% on everything. |
| `categoryRewardRates` | JSON map of category → earn rate %. E.g. `{"Dining": 5, "Travel": 3}`. These are *above* the base rate for specific categories. |
| `categoryCaps` | JSON map of category → monthly ₹ cap on bonus rewards. E.g. `{"Dining": 500}` means max ₹500/month in dining rewards. |
| `signUpBonus` | One-time welcome bonus points/cashback (in ₹ equivalent) if you spend a minimum in the first window. |
| `signUpSpendRequired` | How much you need to spend to unlock the sign-up bonus (₹). |
| `signUpWindowDays` | How many days you have to hit the signup spend. Usually 60–90 days. |
| `milestoneDependency` | `true` if the card's best rewards only kick in after you cross an annual spend threshold. |
| `minAnnualSpend` | Annual spend needed to unlock the milestone bonus (₹). Legacy single-tier field. |
| `milestoneBonus` | Value of the milestone reward (₹). Legacy single-tier field. |
| `milestoneBenefitDesc` | Human-readable description of the milestone reward ("3 PVR tickets + flight voucher"). |
| `milestones` | JSON array of multiple milestone tiers. Format: `[{minAnnualSpend, bonus, desc, type}]`. Overrides the legacy single fields if populated. |
| `loungeAccess` | Whether the card gives airport lounge access: `none`, `domestic`, `domestic+international`, `unlimited` |
| `loungeVisitsPerYear` | Number of free lounge visits per year. Values > 50 mean unlimited (we use 50 as the sentinel). |
| `loungeValuePerVisit` | ₹ value of each lounge visit. Default 700. International lounge cards override to 1000–1200. |
| `forexMarkup` | % surcharge added on every international transaction. Most cards = 3.5%. Zero forex cards = 0. |
| `fuelSurchargeWaiver` | `true` if card waives the 1% surcharge charged at fuel pumps. |
| `bestForTags` | Array of human-readable tags for display ("Frequent Flyer", "Online Shopper", "Cashback"). |
| `features` | Pipe-separated string of notable features ("Free airport transfer \| Concierge"). |
| `spendingCategories` | Array of categories this card is designed for (for rough filtering / display). |
| `platformCoverage` | **v3 accuracy fix.** 0.0–1.0. For merchant-specific cards (Swiggy, Amazon, Scapia), only this fraction of category spend actually earns the bonus rate. 1.0 = full category coverage. |
| `platformNote` | Human-readable explanation of the coverage restriction. E.g. "Only on Swiggy orders". |
| `networkType` | Card network: `Visa`, `Mastercard`, `RuPay`, `Amex`, `Diners`. Affects acceptance and display badge. |
| `employmentRequirement` | `any` = everyone eligible. `salaried` = only salaried employees. `self_employed` = only self-employed. |
| `applyUrl` | Direct link to the bank's application page. |
| `imageUrl` | Card art image URL for display. |
| `isActive` | `false` = card is discontinued or hidden from recommendations. |

### `card_recommendations` table (per-user cache)

| Column | Plain English |
|--------|--------------|
| `userId` | Which user this recommendation is for |
| `month` | Year-month string (`2026-05`). One record per user per month. |
| `recommendations` | Full JSON snapshot of the top 3 `ScoredCard` objects (with all ENVS breakdown fields) |
| `userSnapshot` | The exact `UserProfile` input used to compute this recommendation (income, spend distribution, etc.) |
| `spendSource` | `auto` = spend was inferred from transactions. `manual` = user entered spend amounts manually. |
| `computedAt` | When the recommendation was last calculated. |

### `card_recommendation_feedback` table (ML training data)

| Column | Plain English |
|--------|--------------|
| `userId` | Who gave the feedback |
| `liked` | `true` = user said "Yes, I liked it". `false` = "No". |
| `preferredCard` | Free-text: what card did they actually want? (only filled when liked = false) |
| `recommendedCards` | Array of card IDs that were shown to this user |
| `month` | Which month's recommendation this feedback is for |

### `card_apply_intents` table (conversion tracking)

| Column | Plain English |
|--------|--------------|
| `userId` | Who clicked Apply Now |
| `cardId` | Which card they clicked Apply on |
| `cardName` / `bank` | For easy reporting without a join |
| `month` | When this intent was captured |

---

## Why ENVS vs Simple Reward Rate Comparison

The old way of comparing cards was "which card gives the highest cashback %?" That's misleading because:

1. A 5% dining card is only useful if you spend heavily on dining
2. A ₹5,000 annual fee card might still be worse than a free card even at 5%
3. A lounge card at 2% might be *better* for a frequent traveller than a 4% cashback card
4. A forex-heavy card destroys value for international spenders regardless of its rewards

ENVS converts everything to ₹/year against YOUR specific numbers. It's the only comparison that actually answers: **"How much does this card put in my pocket vs take out?"**

---

## Common Questions

**Q: Why doesn't Federal Scapia show as #1 anymore?**  
It used to rank first for almost every profile because its 10% travel rate was applied to all travel spend. Now `platformCoverage = 0.25` means only 25% of travel spend (the Scapia portal fraction) earns the bonus. The remaining 75% earns the base rate. Much more realistic.

**Q: Why did HSBC Premier show ₹7L value?**  
Its `loungeVisitsPerYear` was stored as `999` (unlimited sentinel) × ₹700/visit = ₹699,300 — clearly wrong. The lounge calculation now caps unlimited cards based on travel intensity. A non-traveller gets credit for 4 realistic lounge visits, not 999.

**Q: Why is envs = Year2+ not Year1?**  
Year 1 includes sign-up bonuses. A card with a ₹10,000 sign-up bonus looks amazing in Year 1 but might have worse recurring value than a no-bonus card. Ranking by Year2+ gives a fair, like-for-like recurring value comparison. Year 1 is still shown in the UI as a bonus figure.

**Q: Why the 5% brand boost for preferred brands?**  
It's a small tiebreaker, not a dominating factor. If two cards score similarly, the preferred brand wins. But if a non-preferred card scores 20% higher, it still wins. The user explicitly asked for HDFC cards, so we honour that within reason.
