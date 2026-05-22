export interface ParsedSms {
  bankName: string
  amount: number           // paise
  type: 'debit' | 'credit'
  accountLast4: string | null
  date: Date | null
  referenceNumber: string | null
  availableBalance: number | null  // paise
  rawSms: string
}

export interface SmsParseResult {
  parsed: ParsedSms[]
  failed: string[]
}

const BANK_MAP: Record<string, string> = {
  HDFCBK: 'HDFC Bank', HDFC: 'HDFC Bank',
  SBIINB: 'SBI', SBIPSG: 'SBI', SBIUPI: 'SBI', SBI: 'SBI',
  ICICIB: 'ICICI Bank', ICICI: 'ICICI Bank',
  AXISBK: 'Axis Bank', AXISBANK: 'Axis Bank',
  KOTAKB: 'Kotak Bank', KOTAK: 'Kotak Bank',
  YESBK: 'Yes Bank', YESBANK: 'Yes Bank',
  INDUSL: 'IndusInd Bank', INDBNK: 'IndusInd Bank',
  PAYTMB: 'Paytm Bank',
  IDFCBK: 'IDFC First Bank',
  BOIIND: 'Bank of India',
  PNBSMS: 'Punjab National Bank',
}

const DEBIT_RE = /(?:debited?|deducted?|withdrawn?|spent|paid)[^\d]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
const CREDIT_RE = /(?:credited?|received?|deposited?|refunded?)[^\d]*(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
const AMOUNT_FALLBACK_RE = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
const ACCT_RE = /(?:a\/c|acct?\.?|account)[^\d]*(?:XX+|x+)(\d{4})/i
const REF_RE = /(?:ref(?:erence)?(?:\s*(?:no\.?|id|#))?|txn(?:\s*(?:id|no\.?))?|imps|neft|upi(?:\s*ref)?)\s*[:\-]?\s*([A-Z0-9]{6,24})/i
const BAL_RE = /(?:avl|avail(?:able)?)\s*(?:bal(?:ance)?)?[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
const DATE_RE = /\b(\d{1,2}[-\/]\w{3,9}[-\/]\d{2,4}|\d{1,2}[-\/]\d{2}[-\/]\d{2,4}|\d{4}-\d{2}-\d{2})\b/

function parseAmount(raw: string): number {
  return Math.round(parseFloat(raw.replace(/,/g, '')) * 100)
}

function detectBank(text: string): string {
  const upper = text.toUpperCase()
  for (const [key, name] of Object.entries(BANK_MAP)) {
    if (upper.includes(key)) return name
  }
  return 'Unknown Bank'
}

function parseDate(raw: string): Date | null {
  const cleaned = raw.replace(/[-\/]/g, ' ')
  const d = new Date(cleaned)
  return isNaN(d.getTime()) ? null : d
}

export class SmsParserEngine {
  static parseMany(lines: string[]): SmsParseResult {
    const parsed: ParsedSms[] = []
    const failed: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const result = SmsParserEngine.parseSingle(trimmed)
      if (result) {
        parsed.push(result)
      } else {
        failed.push(trimmed)
      }
    }

    return { parsed, failed }
  }

  static parseSingle(raw: string): ParsedSms | null {
    const debitMatch = raw.match(DEBIT_RE)
    const creditMatch = raw.match(CREDIT_RE)

    let type: 'debit' | 'credit'
    let amountStr: string

    if (debitMatch) {
      type = 'debit'
      amountStr = debitMatch[1]
    } else if (creditMatch) {
      type = 'credit'
      amountStr = creditMatch[1]
    } else {
      // Try fallback amount detection with context clues
      const fallback = raw.match(AMOUNT_FALLBACK_RE)
      if (!fallback) return null
      const lowerRaw = raw.toLowerCase()
      type = lowerRaw.includes('debit') || lowerRaw.includes('withdraw') || lowerRaw.includes('paid') ? 'debit' : 'credit'
      amountStr = fallback[1]
    }

    const amount = parseAmount(amountStr)
    if (amount <= 0) return null

    const acctMatch = raw.match(ACCT_RE)
    const refMatch = raw.match(REF_RE)
    const balMatch = raw.match(BAL_RE)
    const dateMatch = raw.match(DATE_RE)

    return {
      bankName: detectBank(raw),
      amount,
      type,
      accountLast4: acctMatch ? acctMatch[1] : null,
      date: dateMatch ? parseDate(dateMatch[1]) : null,
      referenceNumber: refMatch ? refMatch[1] : null,
      availableBalance: balMatch ? parseAmount(balMatch[1]) : null,
      rawSms: raw,
    }
  }
}
