import type { Viewport } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { CreateLeagueForm } from '@/components/leagues/create-league-form'

export const metadata = {
  title: 'Create League - AstralField',
  description: 'Create a new fantasy football league'
}

export const viewport: Viewport = {
  themeColor: '#0f172a'
}

export default async function CreateLeaguePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Create New League</h1>
              <p className="text-gray-400 mt-2">
                Set up your fantasy football league and invite friends
              </p>
            </div>
          </div>
        </div>

        <CreateLeagueForm userId={session.user.id} />
      </div>
    </DashboardLayout>
  )
}