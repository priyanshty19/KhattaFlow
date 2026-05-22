import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">FinGrid</h1>
          <p className="text-zinc-500 text-sm mt-1">Your personal finance dashboard</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl',
              headerTitle: 'text-zinc-100',
              headerSubtitle: 'text-zinc-400',
              socialButtonsBlockButton: 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700',
              dividerLine: 'bg-zinc-700',
              dividerText: 'text-zinc-500',
              formFieldLabel: 'text-zinc-300',
              formFieldInput: 'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-emerald-500',
              formButtonPrimary: 'bg-emerald-500 hover:bg-emerald-400',
              footerActionLink: 'text-emerald-400 hover:text-emerald-300',
              identityPreviewText: 'text-zinc-200',
              identityPreviewEditButton: 'text-emerald-400',
            },
          }}
        />
      </div>
    </div>
  )
}
