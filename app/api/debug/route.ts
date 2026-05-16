export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.user.count()
    return Response.json({ ok: true, userCount: count })
  } catch (e: any) {
    return Response.json({
      error: e.message,
      code: e.errorCode,
      clientVersion: e.clientVersion,
      stack: e.stack?.split('\n').slice(0, 8),
    }, { status: 500 })
  }
}
