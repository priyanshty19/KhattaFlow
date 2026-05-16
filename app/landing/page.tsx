import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default function RootPage() {
  const { userId } = auth()
  if (userId) redirect('/')
  redirect('/sign-in')
}
