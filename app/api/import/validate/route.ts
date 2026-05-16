export const dynamic = 'force-dynamic'
// app/api/import/validate/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CSVImportEngine } from '@/lib/engines/csv-import-engine'

export async function POST(req: Request) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rows } = body

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  if (rows.length > 10000) {
    return NextResponse.json({ error: 'Max 10,000 rows per import' }, { status: 400 })
  }

  const categories = await prisma.category.findMany({
    where: { userId, deletedAt: null },
  })

  const result = CSVImportEngine.validateRows(rows, categories as any)
  return NextResponse.json(result)
}
