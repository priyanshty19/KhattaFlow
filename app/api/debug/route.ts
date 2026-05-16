export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    const userCount = await prisma.user.count()
    const catCount = userId ? await prisma.category.count({ where: { userId } }) : -1
    return Response.json({ userId, userCount, catCount })
  } catch (e: any) {
    return Response.json({ error: e.message, stack: e.stack?.split('\n').slice(0, 5) }, { status: 500 })
  }
}
