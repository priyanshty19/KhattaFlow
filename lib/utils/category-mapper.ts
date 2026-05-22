// Maps KhattaFlow category names/slugs to CredWise reward category keys

const MAPPINGS: Array<{ patterns: string[]; rewardKey: string }> = [
  { patterns: ['food', 'dining', 'restaurant', 'eat', 'meal', 'cafe', 'zomato', 'swiggy'], rewardKey: 'Dining' },
  { patterns: ['grocery', 'groceries', 'supermarket', 'blinkit', 'instamart', 'bigbasket'], rewardKey: 'Groceries' },
  { patterns: ['travel', 'flight', 'hotel', 'airline', 'booking', 'vacation', 'trip', 'makemytrip', 'goibibo'], rewardKey: 'Travel' },
  { patterns: ['fuel', 'petrol', 'diesel', 'gas', 'pump', 'cng'], rewardKey: 'Fuel' },
  // 'Shopping' removed — no card rewards "Shopping" specifically; all shopping bonuses are "Online Shopping"
  { patterns: ['shopping', 'retail', 'amazon', 'flipkart', 'myntra', 'ajio', 'store', 'mall', 'online', 'ecommerce'], rewardKey: 'Online Shopping' },
  { patterns: ['entertainment', 'movie', 'cinema', 'ott', 'netflix', 'hotstar', 'streaming', 'spotify', 'gaming'], rewardKey: 'Entertainment' },
  { patterns: ['utility', 'utilities', 'electric', 'electricity', 'water', 'internet', 'broadband', 'phone', 'mobile', 'recharge', 'bill'], rewardKey: 'Utilities' },
  { patterns: ['health', 'medical', 'medicine', 'pharma', 'pharmacy', 'hospital', 'doctor', 'apollo', 'netmeds'], rewardKey: 'Healthcare' },
  { patterns: ['international', 'foreign', 'abroad', 'forex', 'currency', 'overseas'], rewardKey: 'International Spends' },
]

export function mapCategoryToRewardKey(name: string, slug: string): string | null {
  const combined = `${name} ${slug}`.toLowerCase()
  for (const { patterns, rewardKey } of MAPPINGS) {
    if (patterns.some(p => combined.includes(p))) return rewardKey
  }
  return null
}

export const ALL_REWARD_CATEGORIES = [
  'Dining',
  'Groceries',
  'Travel',
  'Fuel',
  'Online Shopping',   // unified — covers in-store retail, Amazon, Flipkart, Myntra etc.
  'Entertainment',
  'Utilities',
  'Healthcare',
  'International Spends',
] as const

export type RewardCategory = typeof ALL_REWARD_CATEGORIES[number]
