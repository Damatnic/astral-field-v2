'use client'

import { ReactNode } from 'react'
import { ModernSidebar } from '@/components/navigation/modern-sidebar'
import { TopNav } from '@/components/navigation/top-nav'
import { useSession } from 'next-auth/react'

interface ModernLayoutProps {
  children: ReactNode
  currentWeek?: number
  leagueName?: string
}

export function ModernLayout({ children, currentWeek, leagueName }: ModernLayoutProps) {
  const { data: session } = useSession()

  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
    teamName: (session?.user as any)?.teamName
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <ModernSidebar user={user} />

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Top Navigation */}
        <TopNav currentWeek={currentWeek} leagueName={leagueName} />

        {/* Page Content */}
        <main className="pt-16 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

