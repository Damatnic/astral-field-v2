import type { Viewport } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ModernLayout } from '@/components/layout/modern-layout'
import { prisma } from '@/lib/database/prisma'
import { LeaguesBrowser } from '@/components/leagues/leagues-browser'

export const metadata = {
  title: 'Leagues - AstralField',
  description: 'Join or create fantasy football leagues'
}

export const viewport: Viewport = {
  themeColor: '#0f172a'
}

async function getLeaguesData(userId: string) {
  try {
    // Get all available leagues
    const allLeagues = await prisma.league.findMany({
      include: {
        teams: {
          include: {
            owner: {
              select: { name: true, email: true }
            }
          }
        },
        _count: {
          select: { teams: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get user's current leagues
    const userTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        league: true
      }
    })

    const userLeagueIds = userTeams.map(team => team.leagueId)

    return {
      allLeagues: allLeagues.map(league => ({
        ...league,
        isUserMember: userLeagueIds.includes(league.id),
        availableSpots: league.maxTeams - league._count.teams
      })),
      userLeagues: userTeams.map(team => team.league)
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch leagues data:', error);
    }
    return {
      allLeagues: [],
      userLeagues: []
    }
  }
}

export default async function LeaguesPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const data = await getLeaguesData(session.user.id)

  return (
    <ModernLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Leagues</h1>
              <p className="text-gray-400 mt-2">
                Join existing leagues or create your own fantasy football league
              </p>
            </div>
            <div className="flex space-x-3">
              <a href="/leagues/create">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium">
                  Create League
                </button>
              </a>
            </div>
          </div>
        </div>

        <LeaguesBrowser 
          leagues={data.allLeagues}
          userLeagues={data.userLeagues}
          currentUserId={session.user.id}
        />
      </div>
    </ModernLayout>
  )
}