import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/layout'
import { prisma } from '@/lib/prisma'
import { TeamSelector } from '@/components/team/team-selector'
import { LineupManager } from '@/components/team/lineup-manager'

interface TeamPageProps {
  searchParams: {
    teamId?: string
  }
}

async function getUserTeamsAndRoster(userId: string, selectedTeamId?: string) {
  // Get all user teams
  const userTeams = await prisma.team.findMany({
    where: { ownerId: userId },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          currentWeek: true
        }
      }
    }
  })

  if (userTeams.length === 0) {
    return { userTeams: [], selectedTeam: null, roster: [] }
  }

  // Select team (either specified or first available)
  const selectedTeam = selectedTeamId 
    ? userTeams.find((t: any) => t.id === selectedTeamId) || userTeams[0]
    : userTeams[0]

  // Get roster for selected team
  const roster = await prisma.rosterPlayer.findMany({
    where: { teamId: selectedTeam.id },
    include: {
      player: {
        include: {
          stats: {
            where: {
              season: 2024,
              week: { lte: selectedTeam.league.currentWeek }
            },
            orderBy: { week: 'desc' },
            take: 3
          },
          projections: {
            where: {
              season: 2024,
              week: selectedTeam.league.currentWeek + 1
            },
            take: 1
          }
        }
      }
    },
    orderBy: [
      { isStarter: 'desc' },
      { position: 'asc' },
      { player: { rank: 'asc' } }
    ]
  })

  // Transform teams to match interface
  const transformedTeams = userTeams.map((team: any) => ({
    ...team,
    pointsFor: 0, // Default value - would need to calculate from stats
    league: {
      ...team.league,
      season: '2024', // Add the season string
      rosterSettings: {} // Default empty roster settings
    }
  }))

  const transformedSelectedTeam = selectedTeam ? {
    ...selectedTeam,
    pointsFor: 0,
    league: {
      ...selectedTeam.league,
      season: '2024',
      rosterSettings: {} // Default empty roster settings
    }
  } : null

  // Transform roster to match RosterPlayer interface
  const transformedRoster = roster.map((rosterPlayer: any) => ({
    ...rosterPlayer,
    isLocked: false, // Default value
    player: {
      ...rosterPlayer.player,
      status: 'ACTIVE', // Default status
      age: null // Not available
    }
  }))

  return { 
    userTeams: transformedTeams, 
    selectedTeam: transformedSelectedTeam, 
    roster: transformedRoster 
  }
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const session = await auth()
  
  if (!session) {
    redirect('/auth/signin')
  }

  const data = await getUserTeamsAndRoster(session.user.id, searchParams.teamId)

  if (data.userTeams.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h1 className="text-3xl font-bold text-white mb-4">No Teams Found</h1>
            <p className="text-gray-400 mb-8">
              You're not currently part of any fantasy leagues. Join a league to start managing your team!
            </p>
            <div className="space-x-4">
              <a href="/leagues/join" className="inline-block">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium">
                  Join League
                </button>
              </a>
              <a href="/leagues/create" className="inline-block">
                <button className="border border-slate-600 hover:border-slate-500 text-white px-6 py-3 rounded-md font-medium">
                  Create League
                </button>
              </a>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 pt-16 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Team Management</h1>
          <p className="text-gray-400 mt-2">
            Set your lineup, make roster moves, and optimize your team
          </p>
        </div>

        {/* Team Selector */}
        <TeamSelector 
          teams={data.userTeams} 
          selectedTeamId={data.selectedTeam?.id}
        />

        {/* Lineup Manager */}
        {data.selectedTeam && (
          <LineupManager 
            team={data.selectedTeam}
            roster={data.roster}
          />
        )}
      </div>
    </DashboardLayout>
  )
}