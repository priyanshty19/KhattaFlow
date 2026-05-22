import { gmail_v1 } from 'googleapis'
import { SmsParserEngine, ParsedSms } from './sms-parser-engine'

interface DecodedBody {
  text: string
  hasPdf: boolean
  pdfAttachmentIds: string[]
}

const BANK_EMAIL_QUERY = [
  'from:alerts@hdfcbank.net',
  'from:alerts@icicibank.com',
  'from:sbiatm@sbi.co.in',
  'from:alerts@axisbank.com',
  'from:noreply@kotak.com',
  'from:alerts@yesbank.in',
  'from:alerts@indusind.com',
  'from:donotreply@paytmbank.com',
].join(' OR ')

export class GmailParserEngine {
  static async searchBankEmails(
    gmail: gmail_v1.Gmail,
    monthsBack = 3
  ): Promise<gmail_v1.Schema$Message[]> {
    const query = `(${BANK_EMAIL_QUERY}) newer_than:${monthsBack}m`
    const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 200 })
    const messages = res.data.messages ?? []

    // Fetch full message details in batches of 10
    const full: gmail_v1.Schema$Message[] = []
    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10)
      const fetched = await Promise.all(
        batch.map(m => gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' }).then(r => r.data))
      )
      full.push(...fetched)
    }
    return full
  }

  static decodeMessageBody(message: gmail_v1.Schema$Message): DecodedBody {
    const parts = message.payload?.parts ?? [message.payload ?? {}]
    let text = ''
    const pdfAttachmentIds: string[] = []

    function walk(parts: gmail_v1.Schema$MessagePart[]) {
      for (const part of parts) {
        if (part.parts) { walk(part.parts); continue }
        const mime = part.mimeType ?? ''
        if (mime === 'text/plain' && part.body?.data) {
          text += Buffer.from(part.body.data, 'base64url').toString('utf8') + '\n'
        } else if (mime === 'text/html' && part.body?.data && !text) {
          const html = Buffer.from(part.body.data, 'base64url').toString('utf8')
          // Strip HTML tags for basic text extraction
          text += html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') + '\n'
        } else if (mime === 'application/pdf' && part.body?.attachmentId) {
          pdfAttachmentIds.push(part.body.attachmentId)
        }
      }
    }

    walk(parts)
    return { text: text.trim(), hasPdf: pdfAttachmentIds.length > 0, pdfAttachmentIds }
  }

  static async fetchAndParsePdfAttachment(
    gmail: gmail_v1.Gmail,
    messageId: string,
    attachmentId: string
  ): Promise<ParsedSms[]> {
    const res = await gmail.users.messages.attachments.get({
      userId: 'me', messageId, id: attachmentId,
    })
    const data = res.data.data
    if (!data) return []

    // Lazy import to keep pdf-parse server-side only
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
    const buffer = Buffer.from(data, 'base64url')
    const parsed = await pdfParse(buffer)

    const lines = parsed.text.split('\n').filter((l: string) => l.trim())
    return lines
      .map((line: string) => SmsParserEngine.parseSingle(line))
      .filter((r: ParsedSms | null): r is ParsedSms => r !== null)
  }

  static parseEmailsToParsedSms(messages: gmail_v1.Schema$Message[]): {
    results: Array<ParsedSms & { gmailMessageId: string }>
    skipped: number
  } {
    const results: Array<ParsedSms & { gmailMessageId: string }> = []
    let skipped = 0

    for (const message of messages) {
      const { text } = GmailParserEngine.decodeMessageBody(message)
      if (!text) { skipped++; continue }

      // Split into lines and try parsing each
      const lines = text.split('\n')
      for (const line of lines) {
        const parsed = SmsParserEngine.parseSingle(line.trim())
        if (parsed) {
          results.push({ ...parsed, gmailMessageId: message.id ?? '' })
          break // one transaction per email message
        }
      }

      if (!results.find(r => r.gmailMessageId === message.id)) skipped++
    }

    return { results, skipped }
  }
}
