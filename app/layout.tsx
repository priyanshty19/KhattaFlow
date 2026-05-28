// app/layout.tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinGrid — Personal Finance Dashboard',
  description: 'Clarity and control over your money through fast tracking and intelligent insights.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/sign-in"
    >
      <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="bg-background text-foreground antialiased">
          <QueryProvider>
            {children}
            <Toaster
              theme="dark"
              position="bottom-right"
              toastOptions={{
                style: { background: '#18181B', border: '1px solid #27272A', color: '#FAFAFA' },
              }}
            />
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
