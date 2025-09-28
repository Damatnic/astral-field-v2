import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { EnhancedAIDashboard } from '@/components/ai-coach/enhanced-ai-dashboard'

export default async function AICoachPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Mock league and team IDs for demo
  const mockLeagueId = 'league_1'
  const mockTeamId = 'team_1'

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center mr-4">
              <span className="text-white font-bold text-lg">🤖</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Nova AI Coach</h1>
              <p className="text-gray-400">
                Elite fantasy intelligence powered by advanced machine learning
              </p>
            </div>
          </div>
        </div>

        <EnhancedAIDashboard 
          userId={session.user.id}
          leagueId={mockLeagueId}
          teamId={mockTeamId}
          currentWeek={4}
        />
      </div>
    </DashboardLayout>
  )
}