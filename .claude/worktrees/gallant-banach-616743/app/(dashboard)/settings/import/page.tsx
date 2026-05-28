// app/(dashboard)/settings/import/page.tsx
import { CSVImportFlow } from '@/components/domain/import/CSVImportFlow'

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Import Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload a CSV or use our template to bulk-import your history.
        </p>
      </div>
      <CSVImportFlow />
    </div>
  )
}
