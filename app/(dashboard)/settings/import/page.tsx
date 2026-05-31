'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { FinancialFetchFlow } from '@/components/domain/import/FinancialFetchFlow'

export default function ImportPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('connected') === 'gmail') {
      toast.success('Gmail connected successfully')
    }
    if (searchParams.get('error') === 'gmail_auth_failed') {
      const detail = searchParams.get('detail')
      toast.error(detail ? `Gmail auth failed: ${detail}` : 'Gmail connection failed. Please try again.', { duration: 10000 })
    }
    if (searchParams.get('error') === 'gmail_user_not_found') {
      toast.error('Gmail account does not match your MyFinGrid account.')
    }
  }, [searchParams])

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Sync Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Automatically fetch all financial data from your Gmail inbox.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
        <FinancialFetchFlow />
      </div>
    </div>
  )
}
