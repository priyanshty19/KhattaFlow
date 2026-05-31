// app/layout.tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import './globals.css'

const APP_NAME = 'myFinGrid'
const APP_TAGLINE = 'Your modern financial operating system'
const APP_DESCRIPTION =
  'myFinGrid is a modern financial operating system — track your wealth, discover opportunities, manage investments, improve credit access, and get personalized financial guidance in one intelligent dashboard.'
const APP_URL = 'https://myfingrid.com'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'myFinGrid', 'personal finance', 'wealth tracking', 'financial operating system',
    'investments', 'budgeting', 'credit cards', 'money dashboard',
  ],
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
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
