import { Suspense } from 'react'
import type { Viewport } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/database/prisma'
import { LiveScoringDashboard } from '@/components/live/live-scoring-dashboard'
import { LeagueChat } from '@/components/chat/league-chat'

export const metadata = {
  title: 'Live Scoring - AstralField',
  description: 'Real-time fantasy football scoring and updates'
}

export const viewport: Viewport = {
  themeColor: '#0f172a'
}

async function getLiveData(userId: string) {
  // Get user's teams and current week info
  const userTeams = await prisma.team.findMany({
    where: { ownerId: userId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          currentWeek: true,
        }
      }
    }
  })

  const currentWeek = userTeams[0]?.league.currentWeek || 1
  const currentLeague = userTeams[0]?.league

  return {
    userTeams,
    currentWeek,
    currentLeague,
    user: await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })
  }
}

export default async function LivePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const data = await getLiveData(session.user.id)

  if (!data.currentLeague) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Leagues Found</h1>
          <p className="text-gray-400 mb-6">
            You need to join a league to view live scoring.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 pt-16 lg:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Scoring Dashboard */}
          <div className="lg:col-span-2">
            <Suspense fallback={
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="loading-spinner h-8 w-8 mx-auto"></div>
              </div>
            }>
              <LiveScoringDashboard 
                leagueId={data.currentLeague.id}
                week={data.currentWeek}
              />
            </Suspense>
          </div>

          {/* League Chat */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">League Chat</h2>
              <Suspense fallback={
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                  <div className="loading-spinner h-6 w-6 mx-auto"></div>
                </div>
              }>
                <LeagueChat
                  leagueId={data.currentLeague.id}
                  currentUserId={data.user?.id || session.user.id}
                  currentUserName={data.user?.name || data.user?.email || 'User'}
                />
              </Suspense>
            </div>

            {/* League Info */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">League Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">League:</span>
                  <span className="text-white">{data.currentLeague.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Season:</span>
                  <span className="text-white">2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Week:</span>
                  <span className="text-white">{data.currentWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Teams:</span>
                  <span className="text-white">{data.userTeams.length}</span>
                </div>
              </div>
            </div>

            {/* Live Status */}
            <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg border border-green-500/30 p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium">Live Updates Active</span>
              </div>
              <p className="text-sm text-gray-300 mt-2">
                Real-time scoring and chat are connected
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}