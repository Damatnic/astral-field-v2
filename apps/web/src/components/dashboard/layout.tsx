import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth()

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <Sidebar user={session.user} />
      <main className="flex-1 lg:ml-0 overflow-auto">
        <div className="lg:pl-0">
          {children}
        </div>
      </main>
    </div>
  )
}