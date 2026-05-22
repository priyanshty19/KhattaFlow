'use client'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CSVImportFlow } from '@/components/domain/import/CSVImportFlow'
import { SMSImportFlow } from '@/components/domain/import/SMSImportFlow'
import { GmailScrapeFlow } from '@/components/domain/import/GmailScrapeFlow'

export default function ImportPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('connected') === 'gmail') {
      toast.success('Gmail connected successfully')
    }
    if (searchParams.get('error') === 'gmail_auth_failed') {
      toast.error('Gmail connection failed. Please try again.')
    }
    if (searchParams.get('error') === 'gmail_user_not_found') {
      toast.error('Gmail account does not match your FinGrid account.')
    }
  }, [searchParams])

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Import Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a CSV, scan your Gmail, or paste bank SMS messages.
        </p>
      </div>

      <Tabs defaultValue="csv">
        <TabsList className="bg-zinc-900 border border-zinc-700/40">
          <TabsTrigger value="csv">CSV Upload</TabsTrigger>
          <TabsTrigger value="gmail">Gmail Scan</TabsTrigger>
          <TabsTrigger value="sms">Paste SMS</TabsTrigger>
        </TabsList>
        <TabsContent value="csv" className="mt-4">
          <CSVImportFlow />
        </TabsContent>
        <TabsContent value="gmail" className="mt-4">
          <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
            <GmailScrapeFlow />
          </div>
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <div className="bg-zinc-900 border border-zinc-600/40 rounded-xl p-5">
            <SMSImportFlow />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
