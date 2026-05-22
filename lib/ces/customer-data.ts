import { prisma } from '@/lib/prisma'

export async function fetchCustomerData(userId: string) {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const [user, transactions, budgets, categories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 100,
      select: {
        id: true, amount: true, type: true, paymentMethod: true,
        description: true, notes: true, date: true, month: true,
        year: true, isRecurring: true, createdAt: true,
        category: { select: { name: true, color: true, icon: true, type: true } },
      },
    }),
    prisma.budget.findMany({
      where: { userId, month: currentMonth },
      select: {
        id: true, categoryId: true, month: true, amount: true,
        category: { select: { name: true, color: true, icon: true, type: true, isFixed: true } },
      },
    }),
    prisma.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, type: true, color: true, icon: true, isSystem: true, isFixed: true, group: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!user) return null

  return {
    profile: {
      id: user.id, email: user.email, phone: user.phone, name: user.name,
      companyName: user.companyName, monthlySalary: user.monthlySalary,
      currency: user.currency, savingsGoalPct: user.savingsGoalPct,
      investmentStyle: user.investmentStyle, createdAt: user.createdAt,
    },
    transactions,
    budgets,
    categories,
  }
}
