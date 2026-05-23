import { gmail_v1 } from 'googleapis'

// ── Type taxonomy ──────────────────────────────────────────────────────────────

export type FinancialEmailType =
  | 'bank_debit'
  | 'bank_credit'
  | 'salary_credit'
  | 'cc_statement'
  | 'cc_payment'
  | 'mf_purchase'
  | 'mf_sip'
  | 'mf_redemption'
  | 'dividend'
  | 'stock_trade'
  | 'loan_emi'
  | 'insurance_premium'
  | 'fd_interest'
  | 'fd_maturity'
  | 'upi_transaction'

export type FinancialCategoryHint = 'income' | 'expense' | 'investment' | 'savings'

export interface ParsedFinancialEmail {
  type: FinancialEmailType
  institution: string
  amount: number                   // paise; 0 for cc_statement (see metadata.totalOutstanding)
  direction: 'debit' | 'credit'
  date: Date | null
  description: string
  metadata: Record<string, unknown>
  rawText: string
  gmailMessageId: string
  subject: string
  categoryHint: FinancialCategoryHint
}

export interface FinancialFetchResult {
  results: ParsedFinancialEmail[]
  skipped: number
  scanned: number
}

// ── Gmail query ────────────────────────────────────────────────────────────────

const SENDER_QUERY = [
  // Banks — alert senders
  'from:alerts@hdfcbank.net',
  'from:netbanking@hdfcbank.com',
  'from:alerts@icicibank.com',
  'from:sbiatm@sbi.co.in',
  'from:noreply@sbi.co.in',
  'from:alerts@axisbank.com',
  'from:noreply@kotak.com',
  'from:alerts@yesbank.in',
  'from:alerts@indusind.com',
  'from:donotreply@paytmbank.com',
  'from:alerts@idfcfirstbank.com',
  'from:noreply@idfcfirstbank.com',
  'from:alerts@bankofbaroda.com',
  'from:alerts@canarabank.in',
  'from:alerts@federalbank.co.in',
  'from:alerts@rblbank.com',
  'from:alerts@bandhanbank.com',
  'from:alerts@aubank.in',
  'from:alerts@dcbbank.com',
  'from:alerts@pnbnet.in',
  'from:boiind@bankofindia.co.in',
  // CC statements
  'from:statement@hdfcbank.com',
  'from:statements@hdfcbank.com',
  'from:creditcard@hdfcbank.com',
  'from:estatement@icicibank.com',
  'from:estatement@axisbank.com',
  'from:estatement@kotak.com',
  'from:statement@sbicard.com',
  'from:donotreply@sbicard.com',
  'from:statement@citibank.com',
  'from:statement@standardchartered.com',
  'from:statement@hsbc.co.in',
  // Investments — brokers + AMCs + registrars
  'from:noreply@zerodha.com',
  'from:noreply@groww.in',
  'from:alerts@groww.in',
  'from:alerts@indmoney.com',
  'from:noreply@indmoney.com',
  'from:accounts@kuvera.in',
  'from:noreply@kuvera.in',
  'from:noreply@paytmmoney.com',
  'from:noreply@etmoney.com',
  'from:alerts@upstox.com',
  'from:noreply@upstox.com',
  'from:noreply@angelone.in',
  'from:noreply@hdfcfund.com',
  'from:donotreply@sbimf.com',
  'from:noreply@icicipruamc.com',
  'from:noreply@axismf.com',
  'from:donotreply@nipponindiaim.com',
  'from:noreply@mirae-asset.in',
  'from:noreply@motilaloswalmf.com',
  'from:noreply@kotakmf.com',
  'from:noreply@dspim.com',
  'from:noreply@camsonline.com',
  'from:donotreply@camsonline.com',
  'from:noreply@kfintech.com',
  'from:noreply@mfuonline.com',
  // Insurance
  'from:noreply@licindia.in',
  'from:noreply@sbilife.co.in',
  'from:noreply@iciciprulife.com',
  'from:noreply@hdfclife.com',
  'from:noreply@maxlifeinsurance.com',
  'from:noreply@bajajallianz.co.in',
  'from:noreply@kotaklife.com',
  'from:noreply@tataaig.com',
  'from:noreply@starhealth.in',
].join(' OR ')

const SUBJECT_QUERY = [
  'subject:"credit card statement"',
  'subject:"SIP confirmation"',
  'subject:"SIP execution"',
  'subject:"mutual fund"',
  'subject:"units allotted"',
  'subject:"redemption confirmation"',
  'subject:"dividend credit"',
  'subject:"IDCW payout"',
  'subject:"contract note"',
  'subject:"trade confirmation"',
  'subject:"EMI auto-debit"',
  'subject:"loan EMI"',
  'subject:"insurance premium"',
  'subject:"policy renewal"',
  'subject:"FD interest"',
  'subject:"fixed deposit"',
  'subject:"salary credited"',
].join(' OR ')

export function buildFinancialQuery(monthsBack: number): string {
  return `((${SENDER_QUERY}) OR (${SUBJECT_QUERY})) newer_than:${monthsBack}m`
}

// ── Email body decoder ────────────────────────────────────────────────────────

function decodeBody(message: gmail_v1.Schema$Message): string {
  const parts = message.payload?.parts ?? [message.payload ?? {}]
  let text = ''

  function walk(parts: gmail_v1.Schema$MessagePart[]) {
    for (const part of parts) {
      if (part.parts) { walk(part.parts); continue }
      const mime = part.mimeType ?? ''
      if (mime === 'text/plain' && part.body?.data) {
        text += Buffer.from(part.body.data, 'base64url').toString('utf8') + '\n'
      } else if (mime === 'text/html' && part.body?.data && !text) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf8')
        text += html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ') + '\n'
      }
    }
  }

  walk(parts)
  return text.trim()
}

function getSubject(message: gmail_v1.Schema$Message): string {
  return message.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value ?? ''
}

function getSender(message: gmail_v1.Schema$Message): string {
  return message.payload?.headers?.find(h => h.name?.toLowerCase() === 'from')?.value ?? ''
}

function getInternalDate(message: gmail_v1.Schema$Message): Date | null {
  const ts = message.internalDate
  return ts ? new Date(parseInt(ts, 10)) : null
}

// ── Amount extraction ─────────────────────────────────────────────────────────

const AMT_RE = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/gi

function firstAmountPaise(text: string): number {
  AMT_RE.lastIndex = 0
  const m = AMT_RE.exec(text)
  AMT_RE.lastIndex = 0
  if (!m) return 0
  return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100)
}

function allAmountsPaise(text: string): number[] {
  AMT_RE.lastIndex = 0
  const amounts: number[] = []
  let m: RegExpExecArray | null
  while ((m = AMT_RE.exec(text)) !== null) {
    const v = Math.round(parseFloat(m[1].replace(/,/g, '')) * 100)
    if (v > 0) amounts.push(v)
  }
  AMT_RE.lastIndex = 0
  return amounts
}

// ── Date extraction ───────────────────────────────────────────────────────────

const DATE_RES = [
  /\b(\d{2}[-\/]\d{2}[-\/]\d{4})\b/,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})\b/i,
  /\b(\d{4}-\d{2}-\d{2})\b/,
  /\b(\d{2}-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4})\b/i,
]

function extractDate(text: string): Date | null {
  for (const re of DATE_RES) {
    const m = text.match(re)
    if (!m) continue
    const raw = m[1].replace(/\//g, '-')
    // dd-MM-yyyy → yyyy-MM-dd
    const ddmm = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (ddmm) {
      const d = new Date(`${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`)
      if (!isNaN(d.getTime())) return d
    }
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

// ── Institution detection ─────────────────────────────────────────────────────

function detectInstitution(sender: string, subject: string, body: string): string {
  const s = (sender + ' ' + subject + ' ' + body.slice(0, 400)).toUpperCase()
  if (s.includes('ZERODHA')) return 'Zerodha'
  if (s.includes('GROWW')) return 'Groww'
  if (s.includes('UPSTOX')) return 'Upstox'
  if (s.includes('ANGEL ONE') || s.includes('ANGELONE') || s.includes('ANGEL BROKING')) return 'Angel One'
  if (s.includes('INDMONEY') || s.includes('IND MONEY')) return 'INDmoney'
  if (s.includes('KUVERA')) return 'Kuvera'
  if (s.includes('PAYTM MONEY')) return 'Paytm Money'
  if (s.includes('ETMONEY')) return 'ET Money'
  if (s.includes('CAMS') || s.includes('CAMSONLINE')) return 'CAMS'
  if (s.includes('KFINTECH') || s.includes('KARVY')) return 'KFintech'
  if (s.includes('SBI LIFE') || s.includes('SBILIFE')) return 'SBI Life'
  if (s.includes('HDFC LIFE') || s.includes('HDFCLIFE')) return 'HDFC Life'
  if (s.includes('ICICI PRU') || s.includes('ICICIPRU')) return 'ICICI Prudential Life'
  if (s.includes('MAX LIFE') || s.includes('MAXLIFE')) return 'Max Life Insurance'
  if (s.includes('BAJAJ ALLIANZ') || s.includes('BAJAJALLIANZ')) return 'Bajaj Allianz'
  if (s.includes('LIC')) return 'LIC'
  if (s.includes('SBI CARD') || s.includes('SBICARD')) return 'SBI Card'
  if (s.includes('HDFC')) return (s.includes('CREDIT') || s.includes('CARD')) ? 'HDFC Credit Card' : 'HDFC Bank'
  if (s.includes('ICICI')) return (s.includes('CREDIT') || s.includes('CARD')) ? 'ICICI Credit Card' : 'ICICI Bank'
  if (s.includes('SBI')) return 'SBI'
  if (s.includes('AXIS')) return (s.includes('CREDIT') || s.includes('CARD')) ? 'Axis Credit Card' : 'Axis Bank'
  if (s.includes('KOTAK')) return (s.includes('CREDIT') || s.includes('CARD')) ? 'Kotak Credit Card' : 'Kotak Bank'
  if (s.includes('YES BANK') || s.includes('YESBANK')) return 'Yes Bank'
  if (s.includes('INDUSIND')) return 'IndusInd Bank'
  if (s.includes('IDFC')) return 'IDFC First Bank'
  if (s.includes('PAYTM')) return 'Paytm'
  if (s.includes('PUNJAB NATIONAL') || s.includes('PNB')) return 'Punjab National Bank'
  if (s.includes('CANARA')) return 'Canara Bank'
  if (s.includes('BANK OF BARODA') || s.includes('BANKOFBARODA')) return 'Bank of Baroda'
  if (s.includes('BANK OF INDIA')) return 'Bank of India'
  if (s.includes('FEDERAL BANK') || s.includes('FEDERALBANK')) return 'Federal Bank'
  if (s.includes('RBL')) return 'RBL Bank'
  if (s.includes('BANDHAN')) return 'Bandhan Bank'
  if (s.includes('AU SMALL') || s.includes('AUBANK')) return 'AU Small Finance Bank'
  if (s.includes('NIPPON')) return 'Nippon India MF'
  if (s.includes('MIRAE')) return 'Mirae Asset MF'
  if (s.includes('MOTILAL') || s.includes('MOSL')) return 'Motilal Oswal MF'
  if (s.includes('DSP')) return 'DSP MF'
  if (s.includes('FRANKLIN')) return 'Franklin Templeton MF'
  if (s.includes('STANDARD CHARTERED')) return 'Standard Chartered'
  if (s.includes('CITI')) return 'Citibank'
  if (s.includes('HSBC')) return 'HSBC'
  return 'Unknown'
}

// ── Email type detection ───────────────────────────────────────────────────────

function detectType(subject: string, body: string): FinancialEmailType {
  const c = (subject + ' ' + body.slice(0, 1000)).toLowerCase()

  // High-specificity investment checks first
  if (/\bsip\b.*\b(confirm|execut|process|success)\b|\b(confirm|execut|process|success)\b.*\bsip\b/.test(c)) return 'mf_sip'
  if (/\b(units\s*allotted|nav|folio)\b/.test(c) || /mutual fund.*\b(purchas|invest|buy)\b/.test(c)) return 'mf_purchase'
  if (/\bredemption\b.*\b(confirm|process|success)\b/.test(c) || /\b(units\s*redeem|amount\s*redeem)\b/.test(c)) return 'mf_redemption'
  if (/\b(dividend|idcw)\b.*\b(credit|paid|payout)\b|\b(payout|credit)\b.*\b(dividend|idcw)\b/.test(c)) return 'dividend'
  if (/\b(contract\s*note|trade\s*confirm|equity.*(?:buy|sell)|stock.*trade)\b/.test(c)) return 'stock_trade'

  // Credit card
  if (/\b(credit\s*card|card)\b.*\bstatement\b|\bstatement\b.*\b(credit\s*card|card)\b/.test(c)) return 'cc_statement'
  if (/\b(minimum\s*(?:amount\s*)?due|outstanding\s*balance|payment\s*due)\b/.test(c)) return 'cc_statement'
  if (/\bcredit\s*card\b.*\bpayment\b|\bcard\s*payment\b/.test(c)) return 'cc_payment'

  // Loan / EMI
  if (/\b(emi|equated\s*monthly)\b/.test(c) || /\bloan\b.*\b(deducted|paid|emi)\b/.test(c)) return 'loan_emi'

  // Insurance
  if (/\b(premium\s*(?:receipt|paid|confirm)|policy\s*renew|insurance\s*premium)\b/.test(c)) return 'insurance_premium'

  // FD
  if (/\b(fixed\s*deposit|fd)\b.*\b(matured|maturity)\b/.test(c)) return 'fd_maturity'
  if (/\b(fd|fixed\s*deposit)\b.*\binterest\b|\binterest\b.*\bfd\b/.test(c)) return 'fd_interest'

  // Salary
  if (/\b(salary|payroll|ctc|stipend)\b.*\b(credit|paid|transfer)\b|\b(credit|paid|transfer)\b.*\b(salary|payroll)\b/.test(c)) return 'salary_credit'

  // UPI
  if (/\bupi\b.*\b(transact|transfer|pay|debit|credit)\b/.test(c)) return 'upi_transaction'

  // Generic bank
  if (/\b(debit|debited|withdrawn|spent|charged)\b/.test(c)) return 'bank_debit'
  if (/\b(credit|credited|received|deposited|refunded)\b/.test(c)) return 'bank_credit'

  return 'bank_debit'
}

// ── Category hint mapping ─────────────────────────────────────────────────────

export function categoryHintFor(type: FinancialEmailType): FinancialCategoryHint {
  switch (type) {
    case 'salary_credit':
    case 'bank_credit':
    case 'fd_interest':
    case 'fd_maturity':
    case 'dividend':
      return 'income'
    case 'mf_purchase':
    case 'mf_sip':
    case 'mf_redemption':
    case 'stock_trade':
      return 'investment'
    default:
      return 'expense'
  }
}

export function directionFor(type: FinancialEmailType): 'debit' | 'credit' {
  switch (type) {
    case 'bank_credit':
    case 'salary_credit':
    case 'fd_interest':
    case 'fd_maturity':
    case 'dividend':
    case 'mf_redemption':
      return 'credit'
    default:
      return 'debit'
  }
}

// ── Type-specific metadata extractors ─────────────────────────────────────────

function extractMFMeta(body: string): Record<string, unknown> {
  const nav = body.match(/\bNAV\b[:\s]*(?:Rs\.?|INR|₹)?\s*([\d.]+)/i)
  const units = body.match(/(?:units?\s*(?:allotted|purchased|bought)?)[:\s]*([\d,.]+)/i)
  const folio = body.match(/(?:folio\s*(?:no\.?|number)?)[:\s]*([A-Z0-9\/\-]+)/i)
  const fund = body.match(/(?:fund\s*(?:name)?|scheme\s*(?:name)?)[:\s]*([^\n\r:]{5,80})/i)
  const isin = body.match(/\bISIN\b[:\s]*([A-Z]{2}[A-Z0-9]{10})/i)
  return {
    nav: nav ? parseFloat(nav[1]) : null,
    units: units ? parseFloat(units[1].replace(/,/g, '')) : null,
    folioNumber: folio ? folio[1].trim() : null,
    fundName: fund ? fund[1].trim().replace(/\s+/g, ' ') : null,
    isin: isin ? isin[1] : null,
  }
}

function extractCCStatementMeta(body: string): Record<string, unknown> {
  const outstanding = body.match(/(?:total\s*(?:amount\s*)?(?:outstanding|due)|outstanding\s*balance)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const minDue = body.match(/(?:minimum\s*(?:amount\s*)?due|min\.?\s*due)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const dueDate = body.match(/(?:due\s*date|payment\s*(?:by|before))[:\s]*(\d{1,2}[-\/\s]+\w{3,9}[-\/\s]+\d{2,4}|\d{1,2}[-\/]\d{2}[-\/]\d{2,4})/i)
  const limit = body.match(/(?:credit\s*limit)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i)
  const avail = body.match(/(?:available\s*(?:credit\s*)?limit)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i)
  return {
    totalOutstanding: outstanding ? Math.round(parseFloat(outstanding[1].replace(/,/g, '')) * 100) : null,
    minimumDue: minDue ? Math.round(parseFloat(minDue[1].replace(/,/g, '')) * 100) : null,
    paymentDueDate: dueDate ? dueDate[1].trim() : null,
    creditLimit: limit ? Math.round(parseFloat(limit[1].replace(/,/g, '')) * 100) : null,
    availableLimit: avail ? Math.round(parseFloat(avail[1].replace(/,/g, '')) * 100) : null,
  }
}

function extractEMIMeta(body: string): Record<string, unknown> {
  const loanAcc = body.match(/(?:loan\s*(?:a\/c|account|no\.?|id))[:\s]*([A-Z0-9\-]+)/i)
  const emi = body.match(/\bEMI\b[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const principal = body.match(/(?:principal)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const interest = body.match(/(?:interest\s*component)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const outstanding = body.match(/(?:outstanding\s*(?:principal|balance))[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  return {
    loanAccount: loanAcc ? loanAcc[1].trim() : null,
    emiAmount: emi ? Math.round(parseFloat(emi[1].replace(/,/g, '')) * 100) : null,
    principalComponent: principal ? Math.round(parseFloat(principal[1].replace(/,/g, '')) * 100) : null,
    interestComponent: interest ? Math.round(parseFloat(interest[1].replace(/,/g, '')) * 100) : null,
    outstandingPrincipal: outstanding ? Math.round(parseFloat(outstanding[1].replace(/,/g, '')) * 100) : null,
  }
}

function extractInsuranceMeta(body: string): Record<string, unknown> {
  const policy = body.match(/(?:policy\s*(?:no\.?|number))[:\s]*([A-Z0-9\-\/]+)/i)
  const dueDate = body.match(/(?:due\s*date|renewal\s*(?:date|by))[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i)
  return {
    policyNumber: policy ? policy[1].trim() : null,
    renewalDueDate: dueDate ? dueDate[1] : null,
  }
}

function extractFDMeta(body: string): Record<string, unknown> {
  const fdNum = body.match(/(?:FD\s*(?:no\.?|a\/c|account|number))[:\s]*([A-Z0-9\-\/]+)/i)
  const interest = body.match(/(?:interest\s*(?:amount|credited)?)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const maturityAmt = body.match(/(?:maturity\s*amount)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const tenure = body.match(/(?:tenure|period)[:\s]*(\d+\s*(?:days?|months?|years?))/i)
  const rate = body.match(/(?:interest\s*rate|rate\s*of\s*interest)[:\s]*([\d.]+)\s*%/i)
  return {
    fdAccount: fdNum ? fdNum[1].trim() : null,
    interestAmount: interest ? Math.round(parseFloat(interest[1].replace(/,/g, '')) * 100) : null,
    maturityAmount: maturityAmt ? Math.round(parseFloat(maturityAmt[1].replace(/,/g, '')) * 100) : null,
    tenure: tenure ? tenure[1] : null,
    interestRate: rate ? parseFloat(rate[1]) : null,
  }
}

function extractDividendMeta(body: string): Record<string, unknown> {
  const fund = body.match(/(?:fund\s*(?:name)?|scheme)[:\s]*([^\n\r:]{5,80})/i)
  const perUnit = body.match(/(?:dividend\s*per\s*unit)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d.]+)/i)
  const folio = body.match(/(?:folio\s*(?:no\.?|number)?)[:\s]*([A-Z0-9\/\-]+)/i)
  return {
    fundName: fund ? fund[1].trim() : null,
    dividendPerUnit: perUnit ? parseFloat(perUnit[1]) : null,
    folioNumber: folio ? folio[1].trim() : null,
  }
}

function extractStockMeta(body: string): Record<string, unknown> {
  const scrip = body.match(/(?:scrip|symbol|stock)[:\s]*([A-Z]{2,12})/i)
  const qty = body.match(/(?:quantity|qty)[:\s]*([\d,]+)/i)
  const price = body.match(/(?:price|trade\s*price)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
  const orderType = body.match(/\b(buy|sell|BUY|SELL)\b/)
  return {
    scrip: scrip ? scrip[1].toUpperCase() : null,
    quantity: qty ? parseInt(qty[1].replace(/,/g, ''), 10) : null,
    price: price ? Math.round(parseFloat(price[1].replace(/,/g, '')) * 100) : null,
    orderType: orderType ? orderType[1].toLowerCase() : null,
  }
}

// ── Build description ─────────────────────────────────────────────────────────

function buildDescription(
  type: FinancialEmailType,
  institution: string,
  body: string,
  meta: Record<string, unknown>
): string {
  switch (type) {
    case 'mf_sip':
    case 'mf_purchase':
      return meta.fundName ? `SIP — ${meta.fundName}` : `MF Purchase — ${institution}`
    case 'mf_redemption':
      return meta.fundName ? `Redemption — ${meta.fundName}` : `MF Redemption — ${institution}`
    case 'dividend':
      return meta.fundName ? `Dividend — ${meta.fundName}` : `Dividend — ${institution}`
    case 'stock_trade': {
      const dir = meta.orderType === 'sell' ? 'Sell' : 'Buy'
      return meta.scrip ? `Stock ${dir} — ${meta.scrip}` : `Stock Trade — ${institution}`
    }
    case 'cc_statement':
      return `Credit Card Statement — ${institution}`
    case 'cc_payment':
      return `Credit Card Payment — ${institution}`
    case 'loan_emi':
      return meta.loanAccount ? `EMI — ${institution} (${meta.loanAccount})` : `Loan EMI — ${institution}`
    case 'insurance_premium':
      return meta.policyNumber ? `Insurance Premium — ${institution} (${meta.policyNumber})` : `Insurance Premium — ${institution}`
    case 'fd_interest':
      return `FD Interest — ${institution}`
    case 'fd_maturity':
      return `FD Maturity — ${institution}`
    case 'salary_credit':
      return `Salary Credit — ${institution}`
    case 'upi_transaction': {
      const ref = body.match(/(?:UPI\s*Ref|Ref\s*No)[:\s]*([A-Z0-9]{6,20})/i)
      return ref ? `UPI — ${ref[1]}` : `UPI Transaction — ${institution}`
    }
    case 'bank_debit':
    case 'bank_credit': {
      const acct = body.match(/(?:a\/c|acct?\.?|account)[^\d]*(?:XX+|x+)(\d{4})/i)
      const suffix = acct ? ` ···${acct[1]}` : ''
      return `${institution}${suffix} — ${type === 'bank_debit' ? 'Debit' : 'Credit'}`
    }
    default:
      return institution
  }
}

// ── Main engine ───────────────────────────────────────────────────────────────

export class FinancialEmailParser {
  static async searchEmails(
    gmail: gmail_v1.Gmail,
    monthsBack = 3
  ): Promise<gmail_v1.Schema$Message[]> {
    const query = buildFinancialQuery(monthsBack)
    const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 500 })
    const messages = res.data.messages ?? []

    const full: gmail_v1.Schema$Message[] = []
    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10)
      const fetched = await Promise.all(
        batch.map(m =>
          gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' }).then(r => r.data)
        )
      )
      full.push(...fetched)
    }
    return full
  }

  static parseMessages(messages: gmail_v1.Schema$Message[]): FinancialFetchResult {
    const results: ParsedFinancialEmail[] = []
    let skipped = 0

    for (const msg of messages) {
      const body = decodeBody(msg)
      const subject = getSubject(msg)
      const sender = getSender(msg)

      if (!body && !subject) { skipped++; continue }

      const type = detectType(subject, body)
      const institution = detectInstitution(sender, subject, body)
      const direction = directionFor(type)
      const categoryHint = categoryHintFor(type)
      const date = extractDate(body) ?? extractDate(subject) ?? getInternalDate(msg)

      // Amount extraction — strategy varies by type
      let amount = 0
      let metadata: Record<string, unknown> = {}

      switch (type) {
        case 'cc_statement': {
          metadata = extractCCStatementMeta(body)
          // Use outstanding as the "display" amount; no transaction amount
          amount = (metadata.totalOutstanding as number) ?? 0
          break
        }
        case 'mf_purchase':
        case 'mf_sip':
        case 'mf_redemption': {
          metadata = extractMFMeta(body)
          amount = firstAmountPaise(body)
          // Try to pick the investment amount specifically
          const amts = allAmountsPaise(body)
          if (amts.length > 0) amount = Math.max(...amts.filter(a => a > 0))
          // SIP amount is usually labeled
          const sipAmt = body.match(/(?:sip\s*amount|investment\s*amount)[^\d₹Rs.]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i)
          if (sipAmt) amount = Math.round(parseFloat(sipAmt[1].replace(/,/g, '')) * 100)
          break
        }
        case 'dividend': {
          metadata = extractDividendMeta(body)
          amount = firstAmountPaise(body)
          break
        }
        case 'stock_trade': {
          metadata = extractStockMeta(body)
          const amts2 = allAmountsPaise(body)
          amount = amts2.length > 0 ? Math.max(...amts2) : 0
          break
        }
        case 'loan_emi': {
          metadata = extractEMIMeta(body)
          amount = (metadata.emiAmount as number) ?? firstAmountPaise(body)
          break
        }
        case 'insurance_premium': {
          metadata = extractInsuranceMeta(body)
          amount = firstAmountPaise(body)
          break
        }
        case 'fd_interest':
        case 'fd_maturity': {
          metadata = extractFDMeta(body)
          amount = (metadata.interestAmount as number) ?? (metadata.maturityAmount as number) ?? firstAmountPaise(body)
          break
        }
        default:
          amount = firstAmountPaise(body)
          break
      }

      if (amount <= 0 && type !== 'cc_statement') { skipped++; continue }

      const description = buildDescription(type, institution, body, metadata)

      results.push({
        type,
        institution,
        amount,
        direction,
        date,
        description,
        metadata,
        rawText: body.slice(0, 2000),
        gmailMessageId: msg.id ?? '',
        subject,
        categoryHint,
      })
    }

    return { results, skipped, scanned: messages.length }
  }
}
