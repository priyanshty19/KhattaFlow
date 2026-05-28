/**
 * Merchant → Category slug suggestion engine.
 *
 * Uses keyword matching on the transaction description + institution name to
 * suggest a category slug. The returned slug is matched against the user's own
 * category list (by Category.slug) in the UI — the user can always override.
 *
 * Isolated to Email Fetch feature. Does not touch any other engine or service.
 */

interface MerchantRule {
  keywords: string[]
  slug: string
}

// Order matters — more specific rules first
const MERCHANT_RULES: MerchantRule[] = [
  // ── Income ───────────────────────────────────────────────────────────────────
  { keywords: ['salary', 'payroll', 'sal credit', 'credited by employer', 'ctc', 'net pay'], slug: 'salary' },
  { keywords: ['dividend', 'div credit', 'dividend credit'], slug: 'dividends' },
  { keywords: ['fd interest', 'fixed deposit interest', 'fd maturity', 'deposit matured'], slug: 'interest-income' },
  { keywords: ['cashback', 'reward credit', 'referral bonus'], slug: 'other-income' },

  // ── Investments ──────────────────────────────────────────────────────────────
  { keywords: ['sip', 'systematic investment', 'mutual fund', 'mf purchase', 'folio', 'nav', 'nfo', 'units allotted'], slug: 'investments' },
  { keywords: ['zerodha', 'groww', 'upstox', 'kite', 'nsdl', 'cdsl', 'demat', 'stock', 'equity', 'bse', 'nse', 'nifty', 'sensex'], slug: 'investments' },
  { keywords: ['ppf', 'nps', 'national pension', 'elss', 'tax saving'], slug: 'investments' },
  { keywords: ['fd booking', 'fixed deposit created', 'rd credit', 'recurring deposit'], slug: 'savings' },

  // ── Food & Dining ─────────────────────────────────────────────────────────────
  { keywords: ['swiggy', 'zomato', 'blinkit', 'zepto', 'dunzo', 'bigbasket', 'grofers', 'instamart'], slug: 'food-dining' },
  { keywords: ['restaurant', 'hotel', 'cafe', 'coffee', 'pizza', 'burger', 'kfc', 'mcdonalds', 'dominos', 'subway', 'haldirams', 'biryani', 'dhaba'], slug: 'food-dining' },

  // ── Transport ────────────────────────────────────────────────────────────────
  { keywords: ['uber', 'ola', 'rapido', 'namma yatri', 'auto', 'taxi', 'cab'], slug: 'transport' },
  { keywords: ['irctc', 'indian railways', 'train ticket', 'pnr', 'metro', 'dmrc', 'bmtc', 'best bus'], slug: 'transport' },
  { keywords: ['indigo', 'air india', 'spicejet', 'akasa', 'vistara', 'go air', 'flight', 'airline', 'makemytrip', 'goibibo', 'ixigo', 'cleartrip'], slug: 'travel' },
  { keywords: ['petrol', 'diesel', 'fuel', 'hp petroleum', 'iocl', 'bpcl', 'bharat petroleum', 'indian oil', 'reliance petro'], slug: 'fuel' },

  // ── Shopping ─────────────────────────────────────────────────────────────────
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq', 'snapdeal', 'jiomart'], slug: 'shopping' },
  { keywords: ['reliance retail', 'dmart', 'big bazaar', 'd-mart', 'more retail', 'star bazaar'], slug: 'shopping' },

  // ── Subscriptions & Entertainment ────────────────────────────────────────────
  { keywords: ['netflix', 'hotstar', 'disney', 'prime video', 'amazon prime', 'sony liv', 'jio cinema', 'zee5', 'mxplayer', 'youtube premium'], slug: 'subscriptions' },
  { keywords: ['spotify', 'apple music', 'gaana', 'wynk', 'jiosaavn'], slug: 'subscriptions' },
  { keywords: ['jio', 'airtel', 'vi ', 'vodafone', 'bsnl', 'mobile recharge', 'prepaid recharge', 'postpaid bill', 'broadband'], slug: 'utilities' },

  // ── Utilities & Bills ─────────────────────────────────────────────────────────
  { keywords: ['electricity', 'bescom', 'msedcl', 'tneb', 'cesc', 'adani electricity', 'power bill', 'wapcos'], slug: 'utilities' },
  { keywords: ['water bill', 'gas bill', 'piped gas', 'lpg', 'igl', 'mgl', 'adani gas', 'cylinder'], slug: 'utilities' },
  { keywords: ['rent', 'house rent', 'rental', 'landlord', 'pg rent', 'hostel fee'], slug: 'rent' },

  // ── Healthcare ────────────────────────────────────────────────────────────────
  { keywords: ['hospital', 'clinic', 'pharmacy', 'medplus', 'apollo pharmacy', 'netmeds', 'practo', '1mg', 'tata 1mg', 'diagnostic', 'lab test', 'pathology'], slug: 'healthcare' },
  { keywords: ['doctor', 'consultation', 'medicine', 'health checkup', 'scan', 'mri', 'xray'], slug: 'healthcare' },

  // ── Education ────────────────────────────────────────────────────────────────
  { keywords: ['udemy', 'coursera', 'byjus', 'unacademy', 'vedantu', 'toppr', 'school fee', 'college fee', 'tuition', 'coaching'], slug: 'education' },

  // ── Insurance ────────────────────────────────────────────────────────────────
  { keywords: ['insurance', 'premium', 'lic', 'hdfc life', 'icici prudential', 'sbi life', 'max life', 'tata aia', 'bajaj allianz', 'star health', 'niva bupa', 'care health'], slug: 'insurance' },

  // ── Loans & EMIs ─────────────────────────────────────────────────────────────
  { keywords: ['emi', 'loan emi', 'equated monthly', 'home loan', 'car loan', 'personal loan', 'education loan', 'emi debit', 'emi payment'], slug: 'loan-emi' },

  // ── Credit Card Bills ─────────────────────────────────────────────────────────
  { keywords: ['cc bill payment', 'credit card payment', 'card payment due', 'statement due', 'cc payment'], slug: 'credit-card-payment' },
]

/**
 * Suggests a category slug based on the description and institution name.
 * Returns null if no rule matches.
 */
export function suggestCategorySlug(description: string, institution: string): string | null {
  const haystack = (description + ' ' + institution).toLowerCase()
  for (const rule of MERCHANT_RULES) {
    if (rule.keywords.some(k => haystack.includes(k))) {
      return rule.slug
    }
  }
  return null
}
