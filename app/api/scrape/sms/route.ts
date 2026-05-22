export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { SmsParserEngine } from '@/lib/engines/sms-parser-engine'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const text: string = body.text ?? ''

  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const lines = text.split('\n')
  const result = SmsParserEngine.parseMany(lines)

  return NextResponse.json({
    parsed: result.parsed,
    failed: result.failed,
    parsedCount: result.parsed.length,
    failedCount: result.failed.length,
  })
}
