import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        variables: {
          colorPrimary: '#10b981',
          colorBackground: '#18181b',
          colorInputBackground: '#27272a',
          colorInputText: '#f4f4f5',
          colorText: '#f4f4f5',
          colorTextSecondary: '#a1a1aa',
          colorNeutral: '#3f3f46',
          borderRadius: '0.75rem',
          fontFamily: 'var(--font-geist-sans)',
        },
        elements: {
          rootBox: 'w-full',
          card: 'bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/40 !rounded-2xl',
          headerTitle: 'text-zinc-100 font-semibold',
          headerSubtitle: 'text-zinc-400',
          socialButtonsBlockButton:
            'bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition-colors !rounded-xl',
          socialButtonsBlockButtonText: 'font-medium',
          dividerLine: 'bg-zinc-800',
          dividerText: 'text-zinc-600',
          formFieldLabel: 'text-zinc-300 text-sm',
          formFieldInput:
            'bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-emerald-500 focus:ring-emerald-500/20 !rounded-xl',
          formButtonPrimary:
            'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold !rounded-xl shadow-lg shadow-emerald-500/20 transition-colors',
          footerActionLink: 'text-emerald-400 hover:text-emerald-300 font-medium',
          footerActionText: 'text-zinc-500',
          identityPreviewText: 'text-zinc-200',
          identityPreviewEditButton: 'text-emerald-400 hover:text-emerald-300',
          alertText: 'text-zinc-200',
          formFieldErrorText: 'text-red-400',
          otpCodeFieldInput: 'bg-zinc-800 border-zinc-700 text-zinc-100 !rounded-xl',
        },
      }}
    />
  )
}
