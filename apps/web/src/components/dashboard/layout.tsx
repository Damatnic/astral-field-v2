import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Suspense } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

// Error boundary component for dashboard layout
function DashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950">
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Something went wrong</h2>
            <p className="text-gray-300">We're having trouble loading the dashboard. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading component for dashboard
function DashboardLoading() {
  return (
    <div className="flex h-screen bg-slate-950">
      <div className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-700 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-64 bg-slate-700 rounded"></div>
              <div className="h-64 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function DashboardLayout({ children }: DashboardLayoutProps) {
  let session
  
  try {
    session = await auth()
  } catch (error) {
    console.error('Dashboard Layout: Auth error:', error)
    redirect('/auth/signin')
  }

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="flex h-screen bg-slate-950">
      <Suspense fallback={<DashboardLoading />}>
        <Sidebar user={session.user} />
      </Suspense>
      <main className="flex-1 lg:ml-0 overflow-auto">
        <div className="lg:pl-0">
          <Suspense fallback={<DashboardLoading />}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  )
}